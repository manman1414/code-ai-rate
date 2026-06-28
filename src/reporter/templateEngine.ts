/**
 * 模板引擎 — JSON / CSV / HTML 报告渲染
 * @author Cursor Agent
 * @date 2026-06-28
 */

import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { ExportReport } from '../types';

/** 工作区导出配置（.vscode/code-ai-rate.json 中的 export 段） */
export interface WorkspaceExportConfig {
  companyName?: string;
  logoPath?: string;
  topN?: number;
  includeFileDetails?: boolean;
  fields?: string[];
  customHeader?: string;
  customFooter?: string;
}

/** 工作区配置文件结构 */
export interface WorkspaceConfigFile {
  export?: WorkspaceExportConfig;
}

const DEFAULT_TEMPLATE_PATH = path.join(__dirname, 'default.hbs');

/** 从工作区根目录加载 .vscode/code-ai-rate.json */
export function loadWorkspaceExportConfig(workspacePath: string): WorkspaceExportConfig | undefined {
  const configPath = path.join(workspacePath, '.vscode', 'code-ai-rate.json');
  if (!fs.existsSync(configPath)) {
    return undefined;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as WorkspaceConfigFile;
    return parsed.export;
  } catch {
    return undefined;
  }
}

/** 将 logo 文件读为 base64 data URI */
function loadLogoBase64(workspacePath: string, logoPath: string): string | undefined {
  const resolved = path.isAbsolute(logoPath)
    ? logoPath
    : path.join(workspacePath, logoPath);
  if (!fs.existsSync(resolved)) {
    return undefined;
  }
  const ext = path.extname(resolved).slice(1).toLowerCase() || 'png';
  const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
  const data = fs.readFileSync(resolved);
  return `data:${mime};base64,${data.toString('base64')}`;
}

/** 按 exportFields 过滤报告字段后输出 JSON */
export function toJson(report: ExportReport, fields?: string[]): string {
  const allowed = fields ?? ['reportMeta', 'summary', 'topFiles', 'fileDetails'];
  const filtered: Partial<ExportReport> = {};
  if (allowed.includes('reportMeta')) filtered.reportMeta = report.reportMeta;
  if (allowed.includes('summary')) filtered.summary = report.summary;
  if (allowed.includes('topFiles')) filtered.topFiles = report.topFiles;
  if (allowed.includes('fileDetails') && report.fileDetails) {
    filtered.fileDetails = report.fileDetails;
  }
  return JSON.stringify(filtered, null, 2);
}

/** 输出文件级明细 CSV */
export function toCsv(report: ExportReport): string {
  const rows: string[] = ['path,language,score,codeLines,topFeature1'];
  const files = report.fileDetails ?? report.topFiles;
  for (const f of files) {
    if (f.skipped) continue;
    const topFeature = f.topFeatures[0]?.name ?? '';
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    rows.push(
      [escape(f.relativePath), escape(f.language), f.fileScore, f.codeLines, escape(topFeature)].join(','),
    );
  }
  return rows.join('\n');
}

/** 计算分布条百分比 */
function distributionPercents(report: ExportReport): Record<'0-30' | '31-60' | '61-100', number> {
  const dist = report.summary.scoreDistribution;
  const total = dist['0-30'] + dist['31-60'] + dist['61-100'];
  if (total === 0) {
    return { '0-30': 0, '31-60': 0, '61-100': 0 };
  }
  return {
    '0-30': Math.round((dist['0-30'] / total) * 100),
    '31-60': Math.round((dist['31-60'] / total) * 100),
    '61-100': Math.round((dist['61-100'] / total) * 100),
  };
}

/** 渲染 HTML 报告；支持自定义模板与工作区 export 配置 */
export function toHtml(
  report: ExportReport,
  templatePath?: string,
  workspaceExportConfig?: WorkspaceExportConfig,
  workspacePath?: string,
): string {
  const tplPath = templatePath && fs.existsSync(templatePath) ? templatePath : DEFAULT_TEMPLATE_PATH;
  const source = fs.readFileSync(tplPath, 'utf8');
  const compile = Handlebars.compile(source);

  let logoBase64: string | undefined;
  if (workspaceExportConfig?.logoPath && workspacePath) {
    logoBase64 = loadLogoBase64(workspacePath, workspaceExportConfig.logoPath);
  }

  const distPercents = distributionPercents(report);
  const topFiles = workspaceExportConfig?.topN
    ? report.topFiles.slice(0, workspaceExportConfig.topN)
    : report.topFiles;

  return compile({
    report,
    companyName: workspaceExportConfig?.companyName,
    logoBase64,
    customHeader: workspaceExportConfig?.customHeader,
    customFooter: workspaceExportConfig?.customFooter,
    distPercents,
    topFiles,
  });
}

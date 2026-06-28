/**
 * 扩展入口：命令注册、扫描编排、导出与自动扫描
 * @author Cursor Agent
 * @date 2026-06-28
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { aggregateMetrics } from './aggregator/metricsAggregator';
import { AUTO_SCAN_DELAY_MS, LARGE_WORKSPACE_FILE_COUNT } from './constants';
import { CodeAiRateConfig, getExtensionConfig, toScanConfigSnapshot } from './config';
import { buildReport } from './reporter/reportBuilder';
import {
  loadWorkspaceExportConfig,
  toCsv,
  toHtml,
  toJson,
} from './reporter/templateEngine';
import { scanWorkspace } from './scanner/workspaceScanner';
import { FileAnalysis, ScanResult } from './types';
import { SidebarProvider } from './ui/sidebarProvider';
import { StatusBar } from './ui/statusBar';

type ExportFormat = 'json' | 'csv' | 'html';

let lastScanResult: ScanResult | undefined;
let mtimeCache = new Map<string, { mtimeMs: number; analysis: FileAnalysis }>();
let cancelTokenSource: vscode.CancellationTokenSource | undefined;
let isScanning = false;
let largeWorkspaceWarned = false;

let outputChannel: vscode.OutputChannel;
let sidebarProvider: SidebarProvider;
let statusBar: StatusBar;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Code AI Rate');
  context.subscriptions.push(outputChannel);

  sidebarProvider = new SidebarProvider(context.extensionUri);
  statusBar = new StatusBar();
  statusBar.register(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  sidebarProvider.setOnScan(() => runScan());
  sidebarProvider.setOnExport(() => handleExport(context));
  sidebarProvider.setOnCancel(() => cancelScan());
  sidebarProvider.setOnOpenFile((relativePath) => openFile(relativePath));

  context.subscriptions.push(
    vscode.commands.registerCommand('codeAiRate.scanWorkspace', () => runScan()),
    vscode.commands.registerCommand('codeAiRate.cancelScan', () => cancelScan()),
    vscode.commands.registerCommand('codeAiRate.openResults', () => openResults()),
    vscode.commands.registerCommand('codeAiRate.exportReport', () => handleExport(context)),
  );

  const config = getExtensionConfig();
  if (config.autoScanOnOpen) {
    const timer = setTimeout(() => {
      void runScan();
    }, AUTO_SCAN_DELAY_MS);
    context.subscriptions.push({ dispose: () => clearTimeout(timer) });
  }
}

export function deactivate(): void {
  cancelTokenSource?.cancel();
  cancelTokenSource?.dispose();
  statusBar?.dispose();
}

/** 聚焦侧边栏视图 */
async function openResults(): Promise<void> {
  await vscode.commands.executeCommand(`${SidebarProvider.viewType}.focus`);
}

/** 通过 vscode.open 打开工作区内的文件 */
async function openFile(relativePath: string): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  const basePath = lastScanResult?.workspacePath ?? folder?.uri.fsPath;
  if (!basePath) {
    return;
  }
  const fileUri = vscode.Uri.file(path.join(basePath, relativePath));
  await vscode.commands.executeCommand('vscode.open', fileUri);
}

/** 取消当前扫描 */
function cancelScan(): void {
  if (cancelTokenSource && isScanning) {
    cancelTokenSource.cancel();
    outputChannel.appendLine('扫描已取消');
  }
}

/** 大工作区文件数提示（每会话仅一次） */
function maybeWarnLargeWorkspace(fileCount: number): void {
  if (largeWorkspaceWarned || fileCount <= LARGE_WORKSPACE_FILE_COUNT) {
    return;
  }
  largeWorkspaceWarned = true;
  void vscode.window.showInformationMessage(
    `工作区包含 ${fileCount} 个文件，扫描可能需要较长时间。`,
  );
}

/** 将跳过的文件与错误写入输出通道 */
function logScanIssues(result: ScanResult): void {
  for (const file of result.fileDetails) {
    if (file.skipped) {
      outputChannel.appendLine(
        `已跳过: ${file.relativePath}${file.skipReason ? ` — ${file.skipReason}` : ''}`,
      );
    }
  }
  if (result.status === 'error') {
    outputChannel.appendLine('扫描以错误状态结束');
  }
}

/** 合并聚合指标到扫描结果 */
function mergeAggregatedMetrics(result: ScanResult, config: CodeAiRateConfig): ScanResult {
  const aggregated = aggregateMetrics(result.fileDetails, {
    topN: config.topN,
    highlightThreshold: config.highlightThreshold,
  });
  return {
    ...result,
    summary: aggregated.summary,
    topFiles: aggregated.topFiles,
  };
}

/** 执行工作区扫描 */
async function runScan(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    void vscode.window.showWarningMessage('请先打开一个文件夹工作区，再开始扫描。');
    return;
  }

  if (isScanning) {
    return;
  }

  const config = getExtensionConfig();
  const root = folder.uri.fsPath;

  isScanning = true;
  cancelTokenSource?.dispose();
  cancelTokenSource = new vscode.CancellationTokenSource();

  sidebarProvider.postScanState('running');
  statusBar.showScanProgress(0);
  void openResults();

  try {
    const rawResult = await scanWorkspace(root, {
      includePatterns: config.includePatterns,
      excludePatterns: config.excludePatterns,
      maxFileSizeKB: config.maxFileSizeKB,
      cache: mtimeCache,
      token: cancelTokenSource.token,
      onProgress: (done, total) => {
        maybeWarnLargeWorkspace(total);
        const percent = total > 0 ? (done / total) * 100 : 0;
        statusBar.showScanProgress(percent);
        sidebarProvider.postScanProgress(done, total);
      },
    });

    const result = mergeAggregatedMetrics(rawResult, config);
    lastScanResult = result;

    logScanIssues(result);
    sidebarProvider.postScanResult(result);
    sidebarProvider.postScanState(result.status);

    if (result.status === 'completed') {
      statusBar.showResult(result.summary.projectAiRate);
      await openResults();
    } else if (result.status === 'cancelled') {
      statusBar.hide();
    } else {
      statusBar.hide();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`扫描错误: ${message}`);
    sidebarProvider.postScanState('error');
    statusBar.hide();
    void openResults();
    void vscode.window.showErrorMessage(`扫描失败: ${message}`);
  } finally {
    isScanning = false;
    cancelTokenSource?.dispose();
    cancelTokenSource = undefined;
  }
}

/** 导出报告：QuickPick → 保存对话框 → 写入文件 */
async function handleExport(context: vscode.ExtensionContext): Promise<void> {
  if (!lastScanResult) {
    const action = await vscode.window.showInformationMessage(
      '尚无扫描结果，请先扫描工作区。',
      '开始扫描',
    );
    if (action === '开始扫描') {
      await runScan();
    }
    return;
  }

  const picked = await vscode.window.showQuickPick(
    [
      { label: 'JSON', description: '完整结构化数据', format: 'json' as const },
      { label: 'CSV', description: '文件级明细表格', format: 'csv' as const },
      { label: 'HTML', description: '可打印人读报告', format: 'html' as const },
    ],
    { placeHolder: '选择导出格式' },
  );
  if (!picked) {
    return;
  }

  const config = getExtensionConfig();
  const extMap: Record<ExportFormat, string> = { json: 'json', csv: 'csv', html: 'html' };
  const dateStr = formatReportDate(new Date());
  const defaultName = `code-ai-rate-report-${dateStr}.${extMap[picked.format]}`;

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(path.join(lastScanResult.workspacePath, defaultName)),
    filters: {
      [picked.label]: [extMap[picked.format]],
    },
  });
  if (!saveUri) {
    return;
  }

  const extensionVersion = context.extension.packageJSON.version as string;
  const report = buildReport(
    lastScanResult,
    extensionVersion,
    toScanConfigSnapshot(config),
    config.disclaimerText,
  );

  let content: string;
  try {
    content = renderExportContent(picked.format, report, config, lastScanResult.workspacePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`导出失败: ${message}`);
    return;
  }

  try {
    await fs.promises.writeFile(saveUri.fsPath, content, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`导出写入失败: ${message}`);
    void vscode.window.showErrorMessage(`无法写入文件: ${message}`);
    return;
  }

  void vscode.window.showInformationMessage(`报告已导出: ${saveUri.fsPath}`);
}

/** 按格式渲染报告内容 */
function renderExportContent(
  format: ExportFormat,
  report: ReturnType<typeof buildReport>,
  config: CodeAiRateConfig,
  workspacePath: string,
): string {
  switch (format) {
    case 'json':
      return toJson(report, config.exportFields);
    case 'csv':
      return toCsv(report);
    case 'html': {
      const workspaceExportConfig = loadWorkspaceExportConfig(workspacePath);
      const templatePath = config.exportTemplate || undefined;
      try {
        return toHtml(report, templatePath, workspaceExportConfig, workspacePath);
      } catch (err) {
        if (templatePath) {
          void vscode.window.showWarningMessage(
            '自定义 HTML 模板渲染失败，已回退到默认模板。',
          );
          return toHtml(report, undefined, workspaceExportConfig, workspacePath);
        }
        throw err;
      }
    }
    default:
      throw new Error(`不支持的导出格式: ${format}`);
  }
}

/** 生成 YYYYMMDD 日期字符串 */
function formatReportDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

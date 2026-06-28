/**
 * 工作区批量扫描（过滤、缓存、分块调度）
 * @author Cursor
 * @date 2026-06-28
 */
import fs from 'fs';
import path from 'path';
import { analyzeFile } from '../analyzers';
import { BATCH_SIZE } from '../constants';
import { FileAnalysis, ScanResult, ScanSummary } from '../types';
import { createFileFilter, loadGitignore } from './fileFilter';

export interface ScanOptions {
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSizeKB: number;
  cache: Map<string, { mtimeMs: number; analysis: FileAnalysis }>;
  token?: { isCancellationRequested: boolean };
  onProgress?: (done: number, total: number) => void;
}

const EMPTY_SUMMARY: ScanSummary = {
  projectAiRate: 0,
  totalFiles: 0,
  analyzedFiles: 0,
  skippedFiles: 0,
  totalCodeLines: 0,
  scoreDistribution: { '0-30': 0, '31-60': 0, '61-100': 0 },
};

function yieldBatch(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** 递归收集工作区内的文件相对路径 */
async function collectFiles(root: string, filter: (rel: string) => boolean): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && filter(rel)) {
        files.push(rel);
      }
    }
  }

  await walk(root);
  return files.sort();
}

/** 读取文件内容；超大文件仅取前 500 行 */
async function readFileContent(
  absPath: string,
  maxFileSizeKB: number,
): Promise<string> {
  const stat = await fs.promises.stat(absPath);
  const maxBytes = maxFileSizeKB * 1024;
  if (stat.size <= maxBytes) {
    return fs.promises.readFile(absPath, 'utf8');
  }
  const raw = await fs.promises.readFile(absPath, 'utf8');
  return raw.split(/\r?\n/).slice(0, 500).join('\n');
}

function buildSummary(fileDetails: FileAnalysis[]): ScanSummary {
  const analyzed = fileDetails.filter((f) => !f.skipped);
  const skipped = fileDetails.filter((f) => f.skipped);
  return {
    ...EMPTY_SUMMARY,
    totalFiles: fileDetails.length,
    analyzedFiles: analyzed.length,
    skippedFiles: skipped.length,
    totalCodeLines: analyzed.reduce((sum, f) => sum + f.codeLines, 0),
  };
}

/** 扫描工作区并返回分析结果（summary/topFiles 由 aggregator 后续填充） */
export async function scanWorkspace(
  root: string,
  options: ScanOptions,
): Promise<ScanResult> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const gitignore = loadGitignore(root);
  const filter = createFileFilter(
    options.includePatterns,
    options.excludePatterns,
    gitignore,
  );

  const relativePaths = await collectFiles(root, filter);
  const total = relativePaths.length;
  const fileDetails: FileAnalysis[] = [];

  for (let i = 0; i < relativePaths.length; i += BATCH_SIZE) {
    if (options.token?.isCancellationRequested) {
      return {
        status: 'cancelled',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        summary: buildSummary(fileDetails),
        topFiles: [],
        fileDetails,
        workspaceName: path.basename(root),
        workspacePath: root,
      };
    }

    const batch = relativePaths.slice(i, i + BATCH_SIZE);
    for (const rel of batch) {
      const abs = path.join(root, rel);
      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(abs);
      } catch {
        continue;
      }

      const cached = options.cache.get(rel);
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        fileDetails.push(cached.analysis);
      } else {
        const content = await readFileContent(abs, options.maxFileSizeKB);
        const analysis = analyzeFile(rel, content);
        options.cache.set(rel, { mtimeMs: stat.mtimeMs, analysis });
        fileDetails.push(analysis);
      }

      options.onProgress?.(fileDetails.length, total);
    }

    if (i + BATCH_SIZE < relativePaths.length) {
      await yieldBatch();
    }
  }

  return {
    status: 'completed',
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    summary: buildSummary(fileDetails),
    topFiles: [],
    fileDetails,
    workspaceName: path.basename(root),
    workspacePath: root,
  };
}

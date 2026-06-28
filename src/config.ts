/**
 * 扩展配置读取
 * @author Cursor Agent
 * @date 2026-06-28
 */

import * as vscode from 'vscode';
import { DEFAULT_DISCLAIMER } from './constants';

/** codeAiRate.* 工作区配置快照 */
export interface CodeAiRateConfig {
  autoScanOnOpen: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  highlightThreshold: number;
  exportTemplate: string;
  exportFields: string[];
  disclaimerText: string;
  maxFileSizeKB: number;
  topN: number;
}

/** 从 VS Code 工作区配置读取全部 codeAiRate.* 设置 */
export function getExtensionConfig(): CodeAiRateConfig {
  const cfg = vscode.workspace.getConfiguration('codeAiRate');
  return {
    autoScanOnOpen: cfg.get<boolean>('autoScanOnOpen') ?? false,
    includePatterns: cfg.get<string[]>('includePatterns') ?? ['**/*'],
    excludePatterns: cfg.get<string[]>('excludePatterns') ?? [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/*.min.js',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
    ],
    highlightThreshold: cfg.get<number>('highlightThreshold') ?? 70,
    exportTemplate: cfg.get<string>('exportTemplate') ?? '',
    exportFields: cfg.get<string[]>('exportFields') ?? [
      'reportMeta',
      'summary',
      'topFiles',
      'fileDetails',
    ],
    disclaimerText: cfg.get<string>('disclaimerText') ?? DEFAULT_DISCLAIMER,
    maxFileSizeKB: cfg.get<number>('maxFileSizeKB') ?? 1024,
    topN: cfg.get<number>('topN') ?? 20,
  };
}

/** 将配置序列化为报告审计字段 */
export function toScanConfigSnapshot(config: CodeAiRateConfig): Record<string, unknown> {
  return { ...config };
}

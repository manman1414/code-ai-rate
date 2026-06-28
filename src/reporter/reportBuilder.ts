/**
 * 报告构建器 — 组装审计字段与扫描摘要
 * @author Cursor Agent
 * @date 2026-06-28
 */

import { ANALYZER_VERSION } from '../constants';
import { ExportReport, ScanResult } from '../types';

/** 将扫描结果组装为可导出的完整报告 */
export function buildReport(
  scan: ScanResult,
  extensionVersion: string,
  scanConfig: Record<string, unknown>,
  disclaimer: string,
): ExportReport {
  return {
    reportMeta: {
      generatedAt: new Date().toISOString(),
      workspaceName: scan.workspaceName,
      workspacePath: scan.workspacePath,
      extensionVersion,
      analyzerVersion: ANALYZER_VERSION,
      scanDurationMs: scan.durationMs ?? 0,
      scanConfig,
      disclaimer,
      scanStatus: scan.status,
    },
    summary: scan.summary,
    topFiles: scan.topFiles,
    fileDetails: scan.fileDetails,
  };
}

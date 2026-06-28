// Author: Cursor | Date: 2026-06-28
import { FileAnalysis, ScanSummary } from '../types';

export interface AggregateOptions {
  topN: number;
  highlightThreshold: number;
}

export function aggregateMetrics(
  fileDetails: FileAnalysis[],
  options: AggregateOptions,
): { summary: ScanSummary; topFiles: FileAnalysis[] } {
  const analyzed = fileDetails.filter((f) => !f.skipped);
  const totalCodeLines = analyzed.reduce((s, f) => s + f.codeLines, 0);
  const weighted = analyzed.reduce((s, f) => s + f.codeLines * f.fileScore, 0);
  const lineWeighted =
    totalCodeLines === 0 ? 0 : weighted / totalCodeLines;

  // 行级加权 + 文件分数 P75 混合
  const scores = analyzed.map((f) => f.fileScore).sort((a, b) => a - b);
  const p75Index = Math.min(scores.length - 1, Math.floor(scores.length * 0.75));
  const p75Score = scores.length > 0 ? scores[p75Index] : 0;
  const projectAiRate =
    totalCodeLines === 0
      ? 0
      : Math.round((lineWeighted * 0.7 + p75Score * 0.3) * 10) / 10;

  const scoreDistribution: Record<'0-30' | '31-60' | '61-100', number> = {
    '0-30': 0,
    '31-60': 0,
    '61-100': 0,
  };
  for (const f of analyzed) {
    if (f.fileScore <= 30) scoreDistribution['0-30']++;
    else if (f.fileScore <= 60) scoreDistribution['31-60']++;
    else scoreDistribution['61-100']++;
  }

  const sorted = [...analyzed].sort((a, b) => b.fileScore - a.fileScore);
  const topFiles = sorted.slice(0, options.topN);

  return {
    summary: {
      projectAiRate,
      totalFiles: fileDetails.length,
      analyzedFiles: analyzed.length,
      skippedFiles: fileDetails.length - analyzed.length,
      totalCodeLines,
      scoreDistribution,
    },
    topFiles,
  };
}

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
  const projectAiRate =
    totalCodeLines === 0 ? 0 : Math.round((weighted / totalCodeLines) * 10) / 10;

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

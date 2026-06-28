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

  const scores = analyzed.map((f) => f.fileScore).sort((a, b) => a - b);
  const p85Index = Math.min(scores.length - 1, Math.floor(scores.length * 0.85));
  const p85Score = scores.length > 0 ? scores[p85Index] : 0;

  const sortedByScore = [...analyzed].sort((a, b) => b.fileScore - a.fileScore);
  const topQuartileCount = Math.max(1, Math.ceil(analyzed.length * 0.25));
  const topQuartileFiles = sortedByScore.slice(0, topQuartileCount);
  const topQuartileLines = topQuartileFiles.reduce((s, f) => s + f.codeLines, 0);
  const topQuartileWeighted = topQuartileFiles.reduce((s, f) => s + f.codeLines * f.fileScore, 0);
  const topQuartileRate = topQuartileLines === 0 ? 0 : topQuartileWeighted / topQuartileLines;

  const projectAiRate =
    totalCodeLines === 0
      ? 0
      : Math.round((lineWeighted * 0.45 + p85Score * 0.35 + topQuartileRate * 0.2) * 10) / 10;

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

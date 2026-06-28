/**
 * 仓库基线校准 — 相对项目常态偏离加分
 * @author Cursor Agent
 * @date 2026-06-28
 */
import { clampScore } from '../analyzers/baseAnalyzer';
import { FileAnalysis } from '../types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 根据工作区中位数基线，对风格偏离较大的文件加分 */
export function applyBaselineCalibration(files: FileAnalysis[]): FileAnalysis[] {
  const analyzed = files.filter((f) => !f.skipped && f.signals);
  if (analyzed.length < 3) return files;

  const medComment = median(analyzed.map((f) => f.signals!.commentRatio));
  const medNameLen = median(analyzed.map((f) => f.signals!.avgNameLength));
  const medBlank = median(analyzed.map((f) => f.signals!.blankLineRatio));

  return files.map((f) => {
    if (f.skipped || !f.signals) return f;

    let boost = 0;
    const s = f.signals;

    if (medComment > 0.02 && s.commentRatio > medComment * 1.35) boost += 10;
    if (medNameLen > 3 && s.avgNameLength > medNameLen * 1.28) boost += 8;
    if (medBlank > 0.04 && s.blankLineRatio > medBlank * 1.45 && s.blankLineRegularity >= 35) {
      boost += 7;
    }

    const styleDeviation =
      Math.abs(s.commentRatio - medComment) / Math.max(medComment, 0.04) +
      Math.abs(s.avgNameLength - medNameLen) / Math.max(medNameLen, 4);
    if (styleDeviation > 1.1) boost += 6;

    if (boost === 0) return f;
    return { ...f, fileScore: clampScore(f.fileScore + boost) };
  });
}

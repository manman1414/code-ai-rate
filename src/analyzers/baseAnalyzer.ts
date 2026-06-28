/**
 * 共享启发式分析器
 * @author Cursor
 * @date 2026-06-28
 */
import { GENERIC_NAMES } from '../constants';
import { FeatureContribution } from '../types';

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeCommentDensity(source: string): number {
  const lines = source.split('\n');
  if (lines.length === 0) return 0;
  const commentLines = lines.filter((l) => /^\s*(#|\/\/|\/\*|\*|"""|''')/.test(l)).length;
  const ratio = commentLines / lines.length;
  return clampScore(ratio * 200);
}

export function computeGenericNameRatio(source: string): number {
  const identifiers = source.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? [];
  if (identifiers.length === 0) return 0;
  const genericCount = identifiers.filter((id) => GENERIC_NAMES.includes(id.toLowerCase())).length;
  return clampScore((genericCount / identifiers.length) * 300);
}

export function computeUniformityScore(source: string): number {
  const lines = source.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return 0;
  const lengths = lines.map((l) => l.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + (len - avg) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  return clampScore(Math.max(0, 100 - stdDev * 3));
}

export function computeBoilerplateScore(source: string): number {
  const patterns = [
    /try\s*{[\s\S]*?}\s*catch/g,
    /^import .+ from .+;$/gm,
    /console\.(log|error|warn)/g,
  ];
  let hits = 0;
  for (const p of patterns) {
    hits += (source.match(p) ?? []).length;
  }
  return clampScore(hits * 15);
}

export function combineFeatures(features: FeatureContribution[]): { score: number; topFeatures: FeatureContribution[] } {
  const totalWeight = features.reduce((s, f) => s + f.weight, 0) || 1;
  const score = clampScore(features.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
  const topFeatures = [...features].sort((a, b) => b.score * b.weight - a.score * a.weight).slice(0, 3);
  return { score, topFeatures };
}

export function countCodeLines(source: string): number {
  return source.split('\n').filter((l) => l.trim().length > 0 && !/^\s*(#|\/\/|\/\*|\*)/.test(l)).length;
}

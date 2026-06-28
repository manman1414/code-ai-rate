/**
 * Java 语言分析器
 * @author Cursor
 * @date 2026-06-28
 */
import {
  combineFeatures,
  computeBoilerplateScore,
  computeCommentDensity,
  computeGenericNameRatio,
  computeUniformityScore,
  countCodeLines,
  clampScore,
} from './baseAnalyzer';
import { FileAnalysis } from '../types';

/** Javadoc 块密度 */
function computeJavadocScore(source: string): number {
  const blocks = (source.match(/\/\*\*[\s\S]*?\*\//g) ?? []).length;
  const lines = source.split('\n').length || 1;
  return clampScore((blocks / lines) * 400);
}

/** getter/setter 对数量 */
function computeGetterSetterScore(source: string): number {
  const getters = (source.match(/public\s+\w+\s+get\w+\s*\(/g) ?? []).length;
  const setters = (source.match(/public\s+void\s+set\w+\s*\(/g) ?? []).length;
  const pairs = Math.min(getters, setters);
  return clampScore(pairs * 20);
}

/** catch 块仅含日志语句 */
function computeCatchLogScore(source: string): number {
  const catchBlocks = source.match(/catch\s*\([^)]+\)\s*\{[^}]+\}/g) ?? [];
  if (catchBlocks.length === 0) return 0;
  const logOnly = catchBlocks.filter((block) =>
    /(System\.out\.println|log\.|logger\.|console\.)/i.test(block) &&
    !/(return|throw)/.test(block),
  ).length;
  return clampScore((logOnly / catchBlocks.length) * 100);
}

/** Service/Impl 后缀命名 */
function computeServiceImplScore(source: string): number {
  const serviceImpl = (source.match(/\b\w+(Service|Impl)\b/g) ?? []).length;
  return clampScore(serviceImpl * 15);
}

export function analyzeJava(relativePath: string, source: string): FileAnalysis {
  const features = [
    // 共享特征 40%
    { name: 'commentDensity', score: computeCommentDensity(source), weight: 0.1 },
    { name: 'genericNames', score: computeGenericNameRatio(source), weight: 0.1 },
    { name: 'uniformity', score: computeUniformityScore(source), weight: 0.1 },
    { name: 'boilerplate', score: computeBoilerplateScore(source), weight: 0.1 },
    // Java 特有特征 60%
    { name: 'javadoc', score: computeJavadocScore(source), weight: 0.15 },
    { name: 'getterSetter', score: computeGetterSetterScore(source), weight: 0.15 },
    { name: 'catchLog', score: computeCatchLogScore(source), weight: 0.15 },
    { name: 'serviceImpl', score: computeServiceImplScore(source), weight: 0.15 },
  ];
  const { score, topFeatures } = combineFeatures(features);
  return {
    relativePath,
    language: 'java',
    codeLines: countCodeLines(source),
    fileScore: score,
    topFeatures,
  };
}

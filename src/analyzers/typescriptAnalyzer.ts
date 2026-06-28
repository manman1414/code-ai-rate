/**
 * TypeScript/JavaScript 语言分析器
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

/** JSDoc 块密度 */
function computeJsdocScore(source: string): number {
  const blocks = (source.match(/\/\*\*[\s\S]*?\*\//g) ?? []).length;
  const lines = source.split('\n').length || 1;
  return clampScore((blocks / lines) * 400);
}

/** async/await 使用频率 */
function computeAsyncAwaitScore(source: string): number {
  const asyncCount = (source.match(/\basync\b/g) ?? []).length;
  const awaitCount = (source.match(/\bawait\b/g) ?? []).length;
  const pairs = Math.min(asyncCount, awaitCount);
  return clampScore(pairs * 25);
}

/** TODO 注释数量 */
function computeTodoScore(source: string): number {
  const todos = (source.match(/\/\/\s*TODO/gi) ?? []).length;
  return clampScore(todos * 30);
}

/** 接口体较空的启发式 */
function computeThinInterfaceScore(source: string): number {
  const interfaces = source.match(/interface\s+\w+\s*\{[^}]*\}/g) ?? [];
  if (interfaces.length === 0) return 0;
  const thinCount = interfaces.filter((block) => {
    const body = block.replace(/interface\s+\w+\s*\{/, '').replace(/\}$/, '');
    const props = body.split(';').filter((l) => l.trim().length > 0);
    return props.length <= 3;
  }).length;
  return clampScore((thinCount / interfaces.length) * 100);
}

export function analyzeTypescript(relativePath: string, source: string): FileAnalysis {
  const features = [
    // 共享特征 40%
    { name: 'commentDensity', score: computeCommentDensity(source), weight: 0.1 },
    { name: 'genericNames', score: computeGenericNameRatio(source), weight: 0.1 },
    { name: 'uniformity', score: computeUniformityScore(source), weight: 0.1 },
    { name: 'boilerplate', score: computeBoilerplateScore(source), weight: 0.1 },
    // TS 特有特征 60%
    { name: 'jsdoc', score: computeJsdocScore(source), weight: 0.15 },
    { name: 'asyncAwait', score: computeAsyncAwaitScore(source), weight: 0.15 },
    { name: 'todoComments', score: computeTodoScore(source), weight: 0.15 },
    { name: 'thinInterfaces', score: computeThinInterfaceScore(source), weight: 0.15 },
  ];
  const { score, topFeatures } = combineFeatures(features);
  return {
    relativePath,
    language: 'typescript',
    codeLines: countCodeLines(source),
    fileScore: score,
    topFeatures,
  };
}

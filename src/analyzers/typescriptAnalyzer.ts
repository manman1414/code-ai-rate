/**
 * TypeScript/JavaScript 语言分析器
 * @author Cursor
 * @date 2026-06-28
 */
import {
  computeAiAuthorshipMarkers,
  computeBoilerplateScore,
  computeCommentDensity,
  computeDefensivePatternScore,
  computeGenericNameRatio,
  computeStructuralRegularity,
  computeUniformityScore,
  computeVerboseNamingScore,
  computeSectionDividerScore,
  computeLineExplainCommentScore,
  finalizeFileAnalysis,
  countCodeLines,
  clampScore,
} from './baseAnalyzer';
import { FileAnalysis } from '../types';

function computeJsdocScore(source: string): number {
  const blocks = (source.match(/\/\*\*[\s\S]*?\*\//g) ?? []).length;
  const lines = source.split('\n').length || 1;
  return clampScore((blocks / lines) * 580);
}

function computeAsyncAwaitScore(source: string): number {
  const asyncCount = (source.match(/\basync\b/g) ?? []).length;
  const awaitCount = (source.match(/\bawait\b/g) ?? []).length;
  const pairs = Math.min(asyncCount, awaitCount);
  return clampScore(pairs * 30);
}

function computeTodoScore(source: string): number {
  const todos = (source.match(/\/\/\s*TODO/gi) ?? []).length;
  return clampScore(todos * 35);
}

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

/** 现代 TS 类型写法（AI 常见），按代码行密度计分 */
function computeModernTypeScore(source: string): number {
  let hits = 0;
  hits += (source.match(/Record<string,\s*unknown>/g) ?? []).length * 2;
  hits += (source.match(/Promise<\w+>/g) ?? []).length * 2;
  hits += (source.match(/:\s*(string|number|boolean|void|null|undefined)\b/g) ?? []).length;
  hits += (source.match(/export\s+(type|interface)\s+/g) ?? []).length * 2;
  const codeLines = countCodeLines(source) || 1;
  const density = hits / codeLines;
  if (codeLines < 20) return clampScore(density * 55);
  return clampScore(density * 200);
}

/** 每个 async 函数都带 try/catch */
function computeTryCatchCoverage(source: string): number {
  const asyncFns = (source.match(/async\s+function/g) ?? []).length;
  const tries = (source.match(/try\s*\{/g) ?? []).length;
  if (asyncFns === 0) return tries > 0 ? clampScore(tries * 20) : 0;
  return clampScore(Math.min(tries / asyncFns, 1) * 100);
}

export function analyzeTypescript(relativePath: string, source: string): FileAnalysis {
  const features = [
    { name: 'commentDensity', score: computeCommentDensity(source), weight: 0.05 },
    { name: 'genericNames', score: computeGenericNameRatio(source), weight: 0.05 },
    { name: 'uniformity', score: computeUniformityScore(source), weight: 0.05 },
    { name: 'boilerplate', score: computeBoilerplateScore(source), weight: 0.05 },
    { name: 'aiMarkers', score: computeAiAuthorshipMarkers(source), weight: 0.09 },
    { name: 'regularity', score: computeStructuralRegularity(source), weight: 0.07 },
    { name: 'verboseNaming', score: computeVerboseNamingScore(source), weight: 0.05 },
    { name: 'defensive', score: computeDefensivePatternScore(source), weight: 0.05 },
    { name: 'sectionDivider', score: computeSectionDividerScore(source), weight: 0.07 },
    { name: 'lineExplain', score: computeLineExplainCommentScore(source), weight: 0.07 },
    { name: 'jsdoc', score: computeJsdocScore(source), weight: 0.11 },
    { name: 'asyncAwait', score: computeAsyncAwaitScore(source), weight: 0.11 },
    { name: 'todoComments', score: computeTodoScore(source), weight: 0.07 },
    { name: 'thinInterfaces', score: computeThinInterfaceScore(source), weight: 0.07 },
    { name: 'modernTypes', score: computeModernTypeScore(source), weight: 0.11 },
    { name: 'tryCatchCoverage', score: computeTryCatchCoverage(source), weight: 0.11 },
  ];
  return finalizeFileAnalysis(relativePath, source, 'typescript', features);
}

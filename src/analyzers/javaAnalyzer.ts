/**
 * Java 语言分析器
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

function computeJavadocScore(source: string): number {
  const blocks = (source.match(/\/\*\*[\s\S]*?\*\//g) ?? []).length;
  const methods = (source.match(/(?:public|private|protected)\s+\w[\w<>,\s]*\s+\w+\s*\(/g) ?? []).length || 1;
  return clampScore((blocks / methods) * 90);
}

function computeGetterSetterScore(source: string): number {
  const getters = (source.match(/public\s+\w+\s+get\w+\s*\(/g) ?? []).length;
  const setters = (source.match(/public\s+void\s+set\w+\s*\(/g) ?? []).length;
  const pairs = Math.min(getters, setters);
  return clampScore(pairs * 22);
}

function computeCatchLogScore(source: string): number {
  const catchBlocks = source.match(/catch\s*\([^)]+\)\s*\{[^}]+\}/g) ?? [];
  if (catchBlocks.length === 0) return 0;
  const logOnly = catchBlocks.filter((block) =>
    /(System\.out\.println|log\.|logger\.|console\.)/i.test(block) &&
    !/(return|throw)/.test(block),
  ).length;
  return clampScore((logOnly / catchBlocks.length) * 100);
}

function computeServiceImplScore(source: string): number {
  const serviceImpl = (source.match(/\b\w+(Service|Impl|Controller|Repository)\b/g) ?? []).length;
  return clampScore(serviceImpl * 16);
}

export function analyzeJava(relativePath: string, source: string): FileAnalysis {
  const features = [
    { name: 'commentDensity', score: computeCommentDensity(source), weight: 0.06 },
    { name: 'genericNames', score: computeGenericNameRatio(source), weight: 0.06 },
    { name: 'uniformity', score: computeUniformityScore(source), weight: 0.06 },
    { name: 'boilerplate', score: computeBoilerplateScore(source), weight: 0.06 },
    { name: 'aiMarkers', score: computeAiAuthorshipMarkers(source), weight: 0.09 },
    { name: 'regularity', score: computeStructuralRegularity(source), weight: 0.07 },
    { name: 'verboseNaming', score: computeVerboseNamingScore(source), weight: 0.06 },
    { name: 'defensive', score: computeDefensivePatternScore(source), weight: 0.06 },
    { name: 'sectionDivider', score: computeSectionDividerScore(source), weight: 0.07 },
    { name: 'lineExplain', score: computeLineExplainCommentScore(source), weight: 0.07 },
    { name: 'javadoc', score: computeJavadocScore(source), weight: 0.11 },
    { name: 'getterSetter', score: computeGetterSetterScore(source), weight: 0.11 },
    { name: 'catchLog', score: computeCatchLogScore(source), weight: 0.07 },
    { name: 'serviceImpl', score: computeServiceImplScore(source), weight: 0.07 },
  ];
  return finalizeFileAnalysis(relativePath, source, 'java', features);
}

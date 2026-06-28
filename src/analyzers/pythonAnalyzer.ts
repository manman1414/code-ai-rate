/**
 * Python 语言分析器
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

function computeDocstringScore(source: string): number {
  const docstrings = (source.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g) ?? []).length;
  const fnCount = (source.match(/^def\s+\w+/gm) ?? []).length || 1;
  return clampScore((docstrings / fnCount) * 80);
}

function computeTypeHintScore(source: string): number {
  const hints = (source.match(/:\s*(int|str|float|bool|list|dict|Optional|List|Dict|Any|->)/gi) ?? []).length;
  return clampScore(hints * 14);
}

function computeSeparatorScore(source: string): number {
  const separators = (source.match(/^#\s*---/gm) ?? []).length;
  return clampScore(separators * 30);
}

function computeMainBlockScore(source: string): number {
  return /if\s+__name__\s*==\s*['"]__main__['"]/.test(source) ? 85 : 0;
}

export function analyzePython(relativePath: string, source: string): FileAnalysis {
  const features = [
    { name: 'commentDensity', score: computeCommentDensity(source), weight: 0.06 },
    { name: 'genericNames', score: computeGenericNameRatio(source), weight: 0.06 },
    { name: 'uniformity', score: computeUniformityScore(source), weight: 0.06 },
    { name: 'boilerplate', score: computeBoilerplateScore(source), weight: 0.06 },
    { name: 'aiMarkers', score: computeAiAuthorshipMarkers(source), weight: 0.09 },
    { name: 'regularity', score: computeStructuralRegularity(source), weight: 0.07 },
    { name: 'verboseNaming', score: computeVerboseNamingScore(source), weight: 0.06 },
    { name: 'defensive', score: computeDefensivePatternScore(source), weight: 0.06 },
    { name: 'sectionDivider', score: computeSectionDividerScore(source), weight: 0.08 },
    { name: 'lineExplain', score: computeLineExplainCommentScore(source), weight: 0.07 },
    { name: 'docstrings', score: computeDocstringScore(source), weight: 0.11 },
    { name: 'typeHints', score: computeTypeHintScore(source), weight: 0.11 },
    { name: 'separators', score: computeSeparatorScore(source), weight: 0.07 },
    { name: 'mainBlock', score: computeMainBlockScore(source), weight: 0.07 },
  ];
  return finalizeFileAnalysis(relativePath, source, 'python', features);
}

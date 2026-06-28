/**
 * Python 语言分析器
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

/** 文档字符串密度 */
function computeDocstringScore(source: string): number {
  const docstrings = (source.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g) ?? []).length;
  const lines = source.split('\n').length || 1;
  return clampScore((docstrings / lines) * 300);
}

/** 类型注解使用频率 */
function computeTypeHintScore(source: string): number {
  const hints = (source.match(/:\s*(int|str|float|bool|list|dict|Optional|List|Dict|->)/gi) ?? []).length;
  return clampScore(hints * 12);
}

/** # --- 分隔符 */
function computeSeparatorScore(source: string): number {
  const separators = (source.match(/^#\s*---/gm) ?? []).length;
  return clampScore(separators * 25);
}

/** if __name__ == "__main__" 入口块 */
function computeMainBlockScore(source: string): number {
  return /if\s+__name__\s*==\s*['"]__main__['"]/.test(source) ? 80 : 0;
}

export function analyzePython(relativePath: string, source: string): FileAnalysis {
  const features = [
    // 共享特征 40%
    { name: 'commentDensity', score: computeCommentDensity(source), weight: 0.1 },
    { name: 'genericNames', score: computeGenericNameRatio(source), weight: 0.1 },
    { name: 'uniformity', score: computeUniformityScore(source), weight: 0.1 },
    { name: 'boilerplate', score: computeBoilerplateScore(source), weight: 0.1 },
    // Python 特有特征 60%
    { name: 'docstrings', score: computeDocstringScore(source), weight: 0.15 },
    { name: 'typeHints', score: computeTypeHintScore(source), weight: 0.15 },
    { name: 'separators', score: computeSeparatorScore(source), weight: 0.15 },
    { name: 'mainBlock', score: computeMainBlockScore(source), weight: 0.15 },
  ];
  const { score, topFeatures } = combineFeatures(features);
  return {
    relativePath,
    language: 'python',
    codeLines: countCodeLines(source),
    fileScore: score,
    topFeatures,
  };
}

/**
 * 分析器路由入口
 * @author Cursor
 * @date 2026-06-28
 */
import { FileAnalysis } from '../types';
import { analyzeTypescript } from './typescriptAnalyzer';
import { analyzePython } from './pythonAnalyzer';
import { analyzeJava } from './javaAnalyzer';
import { countCodeLines } from './baseAnalyzer';

export function analyzeFile(relativePath: string, source: string): FileAnalysis {
  const ext = relativePath.split('.').pop()?.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext ?? '')) {
    return analyzeTypescript(relativePath, source);
  }
  if (ext === 'py') return analyzePython(relativePath, source);
  if (ext === 'java') return analyzeJava(relativePath, source);
  return {
    relativePath,
    language: 'unknown',
    codeLines: countCodeLines(source),
    fileScore: 0,
    topFeatures: [],
    skipped: true,
    skipReason: 'unsupported extension',
  };
}

export { analyzeTypescript } from './typescriptAnalyzer';
export { analyzePython } from './pythonAnalyzer';
export { analyzeJava } from './javaAnalyzer';

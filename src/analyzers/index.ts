/**
 * 分析器路由入口
 * @author Cursor
 * @date 2026-06-28
 */
import { FileAnalysis } from '../types';
import { analyzeWithSharedFeatures, countCodeLines } from './baseAnalyzer';
import { analyzeTypescript } from './typescriptAnalyzer';
import { analyzePython } from './pythonAnalyzer';
import { analyzeJava } from './javaAnalyzer';

function extractVueScript(source: string): string {
  const match = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return match?.[1]?.trim() ?? source;
}

export function analyzeFile(relativePath: string, source: string): FileAnalysis {
  const ext = relativePath.split('.').pop()?.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext ?? '')) {
    return analyzeTypescript(relativePath, source);
  }
  if (ext === 'vue') {
    return analyzeTypescript(relativePath, extractVueScript(source));
  }
  if (ext === 'py') return analyzePython(relativePath, source);
  if (ext === 'java') return analyzeJava(relativePath, source);
  if (['html', 'htm', 'css', 'scss', 'less'].includes(ext ?? '')) {
    return analyzeWithSharedFeatures(relativePath, source, 'unknown');
  }
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

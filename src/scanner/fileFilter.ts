/**
 * 工作区文件过滤（glob + .gitignore）
 * @author Cursor
 * @date 2026-06-28
 */
import fs from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';
import ignore, { Ignore } from 'ignore';

export function createFileFilter(
  includePatterns: string[],
  excludePatterns: string[],
  gitignore?: Ignore,
): (relativePath: string) => boolean {
  return (relativePath: string) => {
    const normalized = relativePath.replace(/\\/g, '/');
    if (gitignore?.ignores(normalized)) return false;
    const included = includePatterns.some((p) =>
      minimatch(normalized, p, { dot: true }),
    );
    if (!included) return false;
    return !excludePatterns.some((p) =>
      minimatch(normalized, p, { dot: true }),
    );
  };
}

/** 从工作区根目录加载 .gitignore 规则 */
export function loadGitignore(root: string): Ignore {
  const ig = ignore();
  try {
    const giPath = path.join(root, '.gitignore');
    if (fs.existsSync(giPath)) {
      ig.add(fs.readFileSync(giPath, 'utf8'));
    }
  } catch {
    /* 无 .gitignore 或读取失败时忽略 */
  }
  return ig;
}

import path from 'path';
import { assert } from 'chai';
import { scanWorkspace } from '../../src/scanner/workspaceScanner';

describe('scanWorkspace integration', () => {
  it('scans fixture workspace and returns summary', async () => {
    const root = path.join(__dirname, '../fixtures/sample-workspace');
    const result = await scanWorkspace(root, {
      includePatterns: ['**/*'],
      excludePatterns: ['**/node_modules/**'],
      maxFileSizeKB: 1024,
      cache: new Map(),
    });

    assert.equal(result.status, 'completed');
    assert.isAtLeast(result.summary.analyzedFiles, 3);
    assert.equal(result.summary.skippedFiles, 0);
    assert.isArray(result.fileDetails);
    assert.equal(result.topFiles.length, 0);
    assert.equal(result.workspaceName, 'sample-workspace');
    assert.equal(result.workspacePath, root);

    const paths = result.fileDetails.map((f) => f.relativePath);
    assert.isFalse(paths.some((p) => p.includes('node_modules')));
    assert.include(paths, 'src/app.ts');
    assert.include(paths, 'src/utils.py');
    assert.include(paths, 'src/UserService.java');
  });

  it('reuses mtime cache on second scan', async () => {
    const root = path.join(__dirname, '../fixtures/sample-workspace');
    const cache = new Map();
    const first = await scanWorkspace(root, {
      includePatterns: ['**/*'],
      excludePatterns: ['**/node_modules/**'],
      maxFileSizeKB: 1024,
      cache,
    });
    assert.equal(first.status, 'completed');
    assert.isAtLeast(cache.size, 3);

    const second = await scanWorkspace(root, {
      includePatterns: ['**/*'],
      excludePatterns: ['**/node_modules/**'],
      maxFileSizeKB: 1024,
      cache,
    });
    assert.equal(second.status, 'completed');
    assert.deepEqual(
      second.fileDetails.map((f) => f.relativePath).sort(),
      first.fileDetails.map((f) => f.relativePath).sort(),
    );
  });
});

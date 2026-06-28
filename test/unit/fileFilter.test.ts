import path from 'path';
import { assert } from 'chai';
import { createFileFilter, loadGitignore } from '../../src/scanner/fileFilter';

describe('fileFilter', () => {
  it('excludes node_modules and lock files', () => {
    const filter = createFileFilter(
      ['**/*'],
      ['**/node_modules/**', '**/package-lock.json'],
    );
    assert.isFalse(filter('node_modules/foo/index.js'));
    assert.isFalse(filter('package-lock.json'));
    assert.isTrue(filter('src/index.ts'));
  });

  it('respects include patterns', () => {
    const filter = createFileFilter(['**/*.ts'], ['**/node_modules/**']);
    assert.isTrue(filter('src/a.ts'));
    assert.isFalse(filter('src/a.py'));
  });

  it('respects .gitignore when fixture exists', () => {
    const fixtureRoot = path.join(__dirname, '..', 'fixtures', 'gitignore-workspace');
    const gitignore = loadGitignore(fixtureRoot);
    const filter = createFileFilter(['**/*'], [], gitignore);

    assert.isFalse(filter('secrets/token.txt'));
    assert.isFalse(filter('debug.log'));
    assert.isTrue(filter('src/index.ts'));
  });
});

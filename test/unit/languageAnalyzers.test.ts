import { assert } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeFile } from '../../src/analyzers/index';

const read = (name: string) => fs.readFileSync(path.join(__dirname, '../fixtures/snippets', name), 'utf8');

describe('language analyzers', () => {
  it('scores AI-style TS higher than human-style TS', () => {
    const ai = analyzeFile('ai-style.ts', read('ai-style.ts'));
    const human = analyzeFile('human-style.ts', read('human-style.ts'));
    assert.isAbove(ai.fileScore, human.fileScore);
    assert.isAtLeast(ai.fileScore, 70, 'AI-style fixture should score at least 70');
    assert.isBelow(human.fileScore, 40, 'human-style fixture should stay low');
  });

  it('detects python language', () => {
    const result = analyzeFile('ai-style.py', read('ai-style.py'));
    assert.equal(result.language, 'python');
    assert.isAtLeast(result.fileScore, 0);
  });

  it('detects java language', () => {
    const result = analyzeFile('User.java', read('ai-style.java'));
    assert.equal(result.language, 'java');
  });

  it('returns skipped for unsupported extension', () => {
    const result = analyzeFile('readme.md', '# Hello\n');
    assert.isTrue(result.skipped);
    assert.equal(result.skipReason, 'unsupported extension');
    assert.equal(result.language, 'unknown');
  });
});

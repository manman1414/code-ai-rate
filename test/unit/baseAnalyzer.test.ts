import { assert } from 'chai';
import {
  clampScore,
  computeCommentDensity,
  computeGenericNameRatio,
  computeUniformityScore,
  computeRestatingCommentScore,
  computeHumanTraceScore,
  computeCatchSwallowScore,
} from '../../src/analyzers/baseAnalyzer';

describe('baseAnalyzer', () => {
  it('clamps score to 0-100', () => {
    assert.equal(clampScore(-5), 0);
    assert.equal(clampScore(150), 100);
    assert.equal(clampScore(42.7), 43);
  });

  it('detects high comment density', () => {
    const code = `// line1\n// line2\nconst x = 1;\n`;
    const score = computeCommentDensity(code);
    assert.isAbove(score, 50);
  });

  it('detects generic names', () => {
    const code = `const data = 1; let result = data; const item = result;`;
    const score = computeGenericNameRatio(code);
    assert.isAbove(score, 40);
  });

  it('scores uniform line lengths higher', () => {
    const uniform = 'const a = 1;\nconst b = 2;\nconst c = 3;\n';
    const varied = 'x();\naVeryLongFunctionNameHere();\ny();\n';
    assert.isAbove(computeUniformityScore(uniform), computeUniformityScore(varied));
  });

  it('detects restating comments', () => {
    const code = `// Get the user\nconst user = getUser();\n// Return the result\nreturn user;\n`;
    assert.isAbove(computeRestatingCommentScore(code), 40);
  });

  it('detects human trace markers', () => {
    const code = `// FIXME: messy hack\nconsole.log('debug');\nconst x = 1;\n`;
    assert.isAbove(computeHumanTraceScore(code), 30);
  });

  it('detects catch swallow pattern', () => {
    const code = `try { doWork(); } catch (e) { console.error(e); }\n`;
    assert.isAbove(computeCatchSwallowScore(code), 50);
  });
});

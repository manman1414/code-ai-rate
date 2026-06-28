import { assert } from 'chai';
import {
  clampScore,
  computeCommentDensity,
  computeGenericNameRatio,
  computeUniformityScore,
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
});

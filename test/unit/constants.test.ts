import { assert } from 'chai';
import { ANALYZER_VERSION, DEFAULT_DISCLAIMER } from '../../src/constants';

describe('constants', () => {
  it('exports analyzer version', () => {
    assert.match(ANALYZER_VERSION, /^\d+\.\d+\.\d+-heuristic$/);
  });

  it('exports non-empty disclaimer', () => {
    assert.isAbove(DEFAULT_DISCLAIMER.length, 10);
  });
});

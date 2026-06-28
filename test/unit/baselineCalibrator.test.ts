import { assert } from 'chai';
import { applyBaselineCalibration } from '../../src/aggregator/baselineCalibrator';
import { FileAnalysis, FileSignals } from '../../src/types';

function makeFile(
  path: string,
  score: number,
  signals: Partial<FileSignals>,
): FileAnalysis {
  return {
    relativePath: path,
    language: 'typescript',
    codeLines: 100,
    fileScore: score,
    topFeatures: [],
    signals: {
      commentRatio: 0.1,
      avgNameLength: 8,
      blankLineRatio: 0.08,
      restatingComment: 0,
      blankLineRegularity: 0,
      catchSwallow: 0,
      humanTrace: 0,
      ...signals,
    },
  };
}

describe('baselineCalibrator', () => {
  it('boosts files that deviate from workspace baseline', () => {
    const files: FileAnalysis[] = [
      makeFile('a.ts', 50, { commentRatio: 0.05, avgNameLength: 6 }),
      makeFile('b.ts', 55, { commentRatio: 0.06, avgNameLength: 7 }),
      makeFile('c.ts', 60, { commentRatio: 0.07, avgNameLength: 8 }),
      makeFile('ai.ts', 70, { commentRatio: 0.22, avgNameLength: 14, blankLineRegularity: 60 }),
    ];
    const calibrated = applyBaselineCalibration(files);
    const ai = calibrated.find((f) => f.relativePath === 'ai.ts');
    assert.isAbove(ai!.fileScore, 70);
  });

  it('skips calibration when fewer than 3 analyzed files', () => {
    const files = [makeFile('a.ts', 40, {}), makeFile('b.ts', 50, {})];
    const calibrated = applyBaselineCalibration(files);
    assert.equal(calibrated[0].fileScore, 40);
  });
});

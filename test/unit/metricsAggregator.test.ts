import { assert } from 'chai';
import { aggregateMetrics } from '../../src/aggregator/metricsAggregator';
import { FileAnalysis } from '../../src/types';

const files: FileAnalysis[] = [
  { relativePath: 'a.ts', language: 'typescript', codeLines: 100, fileScore: 80, topFeatures: [] },
  { relativePath: 'b.ts', language: 'typescript', codeLines: 100, fileScore: 20, topFeatures: [] },
];

describe('metricsAggregator', () => {
  it('computes line-weighted project AI rate', () => {
    const { summary, topFiles } = aggregateMetrics(files, { topN: 10, highlightThreshold: 70 });
    // lineWeighted=50, p85=80, topQuartile=80 → 0.45*50 + 0.35*80 + 0.2*80 = 66.5
    assert.equal(summary.projectAiRate, 66.5);
    assert.equal(summary.scoreDistribution['61-100'], 1);
    assert.equal(topFiles[0].relativePath, 'a.ts');
  });
});

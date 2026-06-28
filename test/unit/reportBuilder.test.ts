import { assert } from 'chai';
import { buildReport } from '../../src/reporter/reportBuilder';
import { ANALYZER_VERSION } from '../../src/constants';
import { ScanResult } from '../../src/types';

function makeScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    status: 'completed',
    startedAt: '2026-06-28T00:00:00.000Z',
    finishedAt: '2026-06-28T00:00:05.000Z',
    durationMs: 5000,
    workspaceName: 'sample-workspace',
    workspacePath: '/tmp/sample-workspace',
    summary: {
      projectAiRate: 45.5,
      totalFiles: 3,
      analyzedFiles: 3,
      skippedFiles: 0,
      totalCodeLines: 200,
      scoreDistribution: { '0-30': 1, '31-60': 1, '61-100': 1 },
    },
    topFiles: [
      { relativePath: 'a.ts', language: 'typescript', codeLines: 100, fileScore: 80, topFeatures: [] },
    ],
    fileDetails: [
      { relativePath: 'a.ts', language: 'typescript', codeLines: 100, fileScore: 80, topFeatures: [] },
      { relativePath: 'b.py', language: 'python', codeLines: 50, fileScore: 40, topFeatures: [] },
    ],
    ...overrides,
  };
}

describe('reportBuilder', () => {
  it('reportMeta contains all audit fields from spec', () => {
    const scanConfig = { topN: 20, highlightThreshold: 70 };
    const disclaimer = '测试免责声明';
    const report = buildReport(makeScan(), '0.1.0', scanConfig, disclaimer);
    const meta = report.reportMeta;

    assert.isString(meta.generatedAt);
    assert.match(meta.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(meta.workspaceName, 'sample-workspace');
    assert.equal(meta.workspacePath, '/tmp/sample-workspace');
    assert.equal(meta.extensionVersion, '0.1.0');
    assert.equal(meta.analyzerVersion, ANALYZER_VERSION);
    assert.equal(meta.scanDurationMs, 5000);
    assert.deepEqual(meta.scanConfig, scanConfig);
    assert.equal(meta.disclaimer, disclaimer);
    assert.equal(meta.scanStatus, 'completed');
  });

  it('includes summary, topFiles, and fileDetails', () => {
    const report = buildReport(makeScan(), '0.1.0', {}, 'disclaimer');
    assert.equal(report.summary.projectAiRate, 45.5);
    assert.lengthOf(report.topFiles, 1);
    assert.lengthOf(report.fileDetails!, 2);
  });
});

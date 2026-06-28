import { assert } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildReport } from '../../src/reporter/reportBuilder';
import { ANALYZER_VERSION, DEFAULT_DISCLAIMER } from '../../src/constants';
import { ScanResult } from '../../src/types';
import { loadWorkspaceExportConfig, toCsv, toHtml, toJson } from '../../src/reporter/templateEngine';

function makeScan(): ScanResult {
  return {
    status: 'completed',
    startedAt: '2026-06-28T00:00:00.000Z',
    durationMs: 1200,
    workspaceName: 'test-ws',
    workspacePath: '/tmp/test-ws',
    summary: {
      projectAiRate: 55,
      totalFiles: 2,
      analyzedFiles: 2,
      skippedFiles: 0,
      totalCodeLines: 150,
      scoreDistribution: { '0-30': 0, '31-60': 1, '61-100': 1 },
    },
    topFiles: [
      {
        relativePath: 'src/app.ts',
        language: 'typescript',
        codeLines: 100,
        fileScore: 72,
        topFeatures: [{ name: 'commentDensity', score: 60, weight: 0.4 }],
      },
    ],
    fileDetails: [
      {
        relativePath: 'src/app.ts',
        language: 'typescript',
        codeLines: 100,
        fileScore: 72,
        topFeatures: [{ name: 'commentDensity', score: 60, weight: 0.4 }],
      },
      {
        relativePath: 'src/util.py',
        language: 'python',
        codeLines: 50,
        fileScore: 38,
        topFeatures: [{ name: 'docstring', score: 45, weight: 0.6 }],
      },
    ],
  };
}

describe('templateEngine', () => {
  const report = buildReport(makeScan(), '0.1.0', { topN: 20 }, DEFAULT_DISCLAIMER);

  it('toJson contains disclaimer and analyzerVersion', () => {
    const json = toJson(report);
    assert.include(json, DEFAULT_DISCLAIMER);
    assert.include(json, ANALYZER_VERSION);
    assert.include(json, '"reportMeta"');
  });

  it('toJson filters fields when exportFields provided', () => {
    const json = toJson(report, ['reportMeta', 'summary']);
    const parsed = JSON.parse(json);
    assert.property(parsed, 'reportMeta');
    assert.property(parsed, 'summary');
    assert.notProperty(parsed, 'topFiles');
    assert.notProperty(parsed, 'fileDetails');
  });

  it('toCsv contains header and file rows', () => {
    const csv = toCsv(report);
    assert.include(csv, 'path,language,score,codeLines,topFeature1');
    assert.include(csv, 'src/app.ts');
    assert.include(csv, 'commentDensity');
  });

  it('toHtml contains disclaimer and analyzerVersion', () => {
    const html = toHtml(report);
    assert.include(html, DEFAULT_DISCLAIMER);
    assert.include(html, ANALYZER_VERSION);
    assert.include(html, '项目摘要');
    assert.include(html, 'src/app.ts');
  });

  it('toHtml resolves template from extension dist folder', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-ai-rate-ext-'));
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir);
    fs.copyFileSync(
      path.join(__dirname, '../../src/reporter/default.hbs'),
      path.join(distDir, 'default.hbs'),
    );
    const html = toHtml(report, undefined, undefined, undefined, tmpDir);
    assert.include(html, '项目摘要');
  });

  it('toHtml applies workspace export config', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-ai-rate-'));
    const logoPath = path.join(tmpDir, 'logo.png');
    fs.writeFileSync(logoPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const vscodeDir = path.join(tmpDir, '.vscode');
    fs.mkdirSync(vscodeDir);
    fs.writeFileSync(
      path.join(vscodeDir, 'code-ai-rate.json'),
      JSON.stringify({
        export: {
          companyName: 'Test Corp',
          logoPath: './logo.png',
          customHeader: '自定义报告标题',
          customFooter: '内部使用 · 非判定依据',
        },
      }),
    );

    const config = loadWorkspaceExportConfig(tmpDir);
    assert.equal(config?.companyName, 'Test Corp');

    const html = toHtml(report, undefined, config, tmpDir);
    assert.include(html, 'Test Corp');
    assert.include(html, '自定义报告标题');
    assert.include(html, '内部使用 · 非判定依据');
    assert.include(html, 'data:image/png;base64,');
  });
});

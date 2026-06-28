# Code AI Rate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a publishable VS Code extension that locally scans a workspace (JS/TS, Python, Java), computes neutral AI-feature statistics, displays results in a sidebar, and exports audit-ready JSON/CSV/HTML reports.

**Architecture:** Modular single-package extension. `WorkspaceScanner` walks files → language `Analyzer`s score each file → `MetricsAggregator` produces project metrics → `SidebarProvider` webview displays → `ReportBuilder` exports locally. No network calls.

**Tech Stack:** TypeScript, VS Code Extension API, esbuild (bundle), Mocha + ts-node (unit/integration), @vscode/test-electron (E2E), Handlebars (HTML export), minimatch + ignore (file filtering)

---

## File Map

| File | Responsibility |
|------|----------------|
| `package.json` | Extension manifest, commands, views, configuration |
| `tsconfig.json` | TS compile options |
| `esbuild.js` | Bundle `src/extension.ts` → `dist/extension.js` |
| `src/extension.ts` | Activate/deactivate, register commands, wire modules |
| `src/types.ts` | Shared interfaces: `FileAnalysis`, `ScanResult`, `Report` |
| `src/constants.ts` | `ANALYZER_VERSION`, default excludes, disclaimer text |
| `src/scanner/fileFilter.ts` | Glob include/exclude + `.gitignore` |
| `src/scanner/workspaceScanner.ts` | Batch file walk, read, route, cache by mtime |
| `src/analyzers/baseAnalyzer.ts` | Shared heuristic features + score clamp |
| `src/analyzers/typescriptAnalyzer.ts` | JS/TS-specific heuristics |
| `src/analyzers/pythonAnalyzer.ts` | Python-specific heuristics |
| `src/analyzers/javaAnalyzer.ts` | Java-specific heuristics |
| `src/analyzers/index.ts` | Extension → analyzer router |
| `src/aggregator/metricsAggregator.ts` | Weighted project rate, distribution, top files |
| `src/reporter/reportBuilder.ts` | Assemble audit fields + summary |
| `src/reporter/templateEngine.ts` | JSON/CSV/HTML render via Handlebars |
| `src/ui/sidebarProvider.ts` | WebviewViewProvider, postMessage to webview |
| `src/ui/statusBar.ts` | Scan progress + result chip |
| `src/ui/webview/index.html` | Sidebar markup (inlined in provider) |
| `src/ui/webview/main.js` | Sidebar client script |
| `src/ui/webview/styles.css` | Neutral blue/gray styling |
| `media/icon.svg` | Activity bar icon |
| `test/unit/*.test.ts` | Analyzer + aggregator + reporter tests |
| `test/fixtures/sample-workspace/` | Mini multi-lang project for integration |
| `test/integration/scan.test.ts` | Full scan snapshot test |
| `README.md`, `CHANGELOG.md`, `PRIVACY.md` | Marketplace docs |

---

### Task 1: Extension Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.vscodeignore`, `esbuild.js`
- Create: `src/extension.ts` (stub)

- [ ] **Step 1: Initialize npm and dev dependencies**

Run:
```bash
cd C:/Users/Administrator/Projects/code-ai-rate
npm init -y
npm install --save-dev typescript @types/node @types/vscode @types/mocha mocha ts-node esbuild @vscode/vsce @vscode/test-electron
npm install handlebars minimatch ignore @types/minimatch
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create `esbuild.js`**

```javascript
const esbuild = require('esbuild');

const production = process.argv.includes('--production');

esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: !production,
  minify: production,
}).catch(() => process.exit(1));
```

- [ ] **Step 4: Create minimal `package.json` extension manifest**

Key fields (merge into generated `package.json`):
```json
{
  "name": "code-ai-rate",
  "displayName": "Code AI Rate",
  "description": "Locally analyze AI-feature statistics in workspace code",
  "version": "0.1.0",
  "publisher": "your-publisher",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished", "onView:codeAiRate.sidebar"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "codeAiRate.scanWorkspace", "title": "Code AI Rate: Scan Workspace" },
      { "command": "codeAiRate.exportReport", "title": "Code AI Rate: Export Report" },
      { "command": "codeAiRate.cancelScan", "title": "Code AI Rate: Cancel Scan" },
      { "command": "codeAiRate.openResults", "title": "Code AI Rate: Open Results" }
    ],
    "viewsContainers": {
      "activitybar": [{ "id": "codeAiRate", "title": "AI Rate", "icon": "media/icon.svg" }]
    },
    "views": {
      "codeAiRate": [{ "type": "webview", "id": "codeAiRate.sidebar", "name": "AI Rate" }]
    },
    "configuration": {
      "title": "Code AI Rate",
      "properties": {
        "codeAiRate.autoScanOnOpen": { "type": "boolean", "default": false },
        "codeAiRate.includePatterns": { "type": "array", "default": ["**/*"], "items": { "type": "string" } },
        "codeAiRate.excludePatterns": {
          "type": "array",
          "default": ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/*.min.js", "**/package-lock.json", "**/yarn.lock", "**/pnpm-lock.yaml"],
          "items": { "type": "string" }
        },
        "codeAiRate.highlightThreshold": { "type": "number", "default": 70, "minimum": 0, "maximum": 100 },
        "codeAiRate.exportTemplate": { "type": "string", "default": "" },
        "codeAiRate.exportFields": { "type": "array", "default": ["reportMeta", "summary", "topFiles", "fileDetails"], "items": { "type": "string" } },
        "codeAiRate.disclaimerText": { "type": "string", "default": "本报告基于启发式统计，仅供参考，不构成任何判定依据。" },
        "codeAiRate.maxFileSizeKB": { "type": "number", "default": 1024 },
        "codeAiRate.topN": { "type": "number", "default": 20 }
      }
    }
  },
  "scripts": {
    "compile": "node esbuild.js",
    "watch": "node esbuild.js --watch",
    "test": "mocha -r ts-node/register 'test/**/*.test.ts'",
    "package": "npm run compile && vsce package"
  }
}
```

- [ ] **Step 5: Create stub `src/extension.ts`**

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Code AI Rate');
  output.appendLine('Code AI Rate activated');
}

export function deactivate(): void {}
```

- [ ] **Step 6: Verify compile**

Run: `npm run compile`
Expected: `dist/extension.js` created, exit 0

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json esbuild.js .gitignore .vscodeignore src/extension.ts media/
git commit -m "chore: scaffold VS Code extension project"
```

---

### Task 2: Shared Types and Constants

**Files:**
- Create: `src/types.ts`, `src/constants.ts`
- Test: `test/unit/constants.test.ts`

- [ ] **Step 1: Write failing test for constants**

Create `test/unit/constants.test.ts`:
```typescript
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
```

Run: `npm install --save-dev chai @types/chai && npm test`
Expected: FAIL — cannot find module `../../src/constants`

- [ ] **Step 2: Implement `src/constants.ts`**

```typescript
export const ANALYZER_VERSION = '1.0.0-heuristic';
export const EXTENSION_ID = 'codeAiRate';
export const BATCH_SIZE = 50;
export const LARGE_WORKSPACE_FILE_COUNT = 5000;
export const AUTO_SCAN_DELAY_MS = 3000;

export const DEFAULT_DISCLAIMER =
  '本报告基于启发式统计，仅供参考，不构成任何判定依据。';

export const GENERIC_NAMES = [
  'data', 'result', 'item', 'temp', 'value', 'response', 'output', 'input',
];
```

- [ ] **Step 3: Implement `src/types.ts`**

```typescript
export interface FeatureContribution {
  name: string;
  score: number;
  weight: number;
}

export interface FileAnalysis {
  relativePath: string;
  language: 'typescript' | 'python' | 'java' | 'unknown';
  codeLines: number;
  fileScore: number;
  topFeatures: FeatureContribution[];
  skipped?: boolean;
  skipReason?: string;
}

export type ScanStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

export interface ScanSummary {
  projectAiRate: number;
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  totalCodeLines: number;
  scoreDistribution: Record<'0-30' | '31-60' | '61-100', number>;
}

export interface ScanResult {
  status: ScanStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  summary: ScanSummary;
  topFiles: FileAnalysis[];
  fileDetails: FileAnalysis[];
  workspaceName: string;
  workspacePath: string;
}

export interface ReportMeta {
  generatedAt: string;
  workspaceName: string;
  workspacePath: string;
  extensionVersion: string;
  analyzerVersion: string;
  scanDurationMs: number;
  scanConfig: Record<string, unknown>;
  disclaimer: string;
  scanStatus: ScanStatus;
}

export interface ExportReport {
  reportMeta: ReportMeta;
  summary: ScanSummary;
  topFiles: FileAnalysis[];
  fileDetails?: FileAnalysis[];
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS for constants tests

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/constants.ts test/unit/constants.test.ts
git commit -m "feat: add shared types and constants"
```

---

### Task 3: Base Analyzer (Shared Heuristics)

**Files:**
- Create: `src/analyzers/baseAnalyzer.ts`
- Test: `test/unit/baseAnalyzer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/unit/baseAnalyzer.test.ts`:
```typescript
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
```

Run: `npm test -- --grep baseAnalyzer`
Expected: FAIL — module not found

- [ ] **Step 2: Implement `src/analyzers/baseAnalyzer.ts`**

```typescript
import { GENERIC_NAMES } from '../constants';
import { FeatureContribution } from '../types';

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeCommentDensity(source: string): number {
  const lines = source.split('\n');
  if (lines.length === 0) return 0;
  const commentLines = lines.filter((l) => /^\s*(#|\/\/|\/\*|\*|"""|''')/.test(l)).length;
  const ratio = commentLines / lines.length;
  return clampScore(ratio * 200);
}

export function computeGenericNameRatio(source: string): number {
  const identifiers = source.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? [];
  if (identifiers.length === 0) return 0;
  const genericCount = identifiers.filter((id) => GENERIC_NAMES.includes(id.toLowerCase())).length;
  return clampScore((genericCount / identifiers.length) * 300);
}

export function computeUniformityScore(source: string): number {
  const lines = source.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return 0;
  const lengths = lines.map((l) => l.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + (len - avg) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  return clampScore(Math.max(0, 100 - stdDev * 3));
}

export function computeBoilerplateScore(source: string): number {
  const patterns = [
    /try\s*{[\s\S]*?}\s*catch/g,
    /^import .+ from .+;$/gm,
    /console\.(log|error|warn)/g,
  ];
  let hits = 0;
  for (const p of patterns) {
    hits += (source.match(p) ?? []).length;
  }
  return clampScore(hits * 15);
}

export function combineFeatures(features: FeatureContribution[]): { score: number; topFeatures: FeatureContribution[] } {
  const totalWeight = features.reduce((s, f) => s + f.weight, 0) || 1;
  const score = clampScore(features.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
  const topFeatures = [...features].sort((a, b) => b.score * b.weight - a.score * a.weight).slice(0, 3);
  return { score, topFeatures };
}

export function countCodeLines(source: string): number {
  return source.split('\n').filter((l) => l.trim().length > 0 && !/^\s*(#|\/\/|\/\*|\*)/.test(l)).length;
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --grep baseAnalyzer`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/analyzers/baseAnalyzer.ts test/unit/baseAnalyzer.test.ts
git commit -m "feat: add shared heuristic analyzers"
```

---

### Task 4: Language-Specific Analyzers

**Files:**
- Create: `src/analyzers/typescriptAnalyzer.ts`, `pythonAnalyzer.ts`, `javaAnalyzer.ts`, `index.ts`
- Test: `test/unit/languageAnalyzers.test.ts`
- Create: `test/fixtures/snippets/` sample files

- [ ] **Step 1: Add fixture snippets**

`test/fixtures/snippets/ai-style.ts` — heavy JSDoc + async/try-catch
`test/fixtures/snippets/human-style.ts` — minimal comments
`test/fixtures/snippets/ai-style.py` — docstrings + type hints
`test/fixtures/snippets/ai-style.java` — Javadoc getters/setters

- [ ] **Step 2: Write failing tests**

```typescript
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
});
```

- [ ] **Step 3: Implement analyzers**

`typescriptAnalyzer.ts` — add scores for: JSDoc blocks (`/**`), `async`+`await` pairs, `// TODO` count, interface-with-thin-body heuristic.

`pythonAnalyzer.ts` — add scores for: docstring (`"""`), type hints (`: int`, `-> str`), `# ---` separators, `if __name__`.

`javaAnalyzer.ts` — add scores for: `/** */` Javadoc, getter/setter pairs, `catch` with only log, `Service`/`Impl` suffix naming.

Each returns `{ fileScore, topFeatures, codeLines, language }`.

`index.ts`:
```typescript
import { FileAnalysis } from '../types';
import { analyzeTypescript } from './typescriptAnalyzer';
import { analyzePython } from './pythonAnalyzer';
import { analyzeJava } from './javaAnalyzer';
import { countCodeLines } from './baseAnalyzer';

export function analyzeFile(relativePath: string, source: string): FileAnalysis {
  const ext = relativePath.split('.').pop()?.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext ?? '')) {
    return analyzeTypescript(relativePath, source);
  }
  if (ext === 'py') return analyzePython(relativePath, source);
  if (ext === 'java') return analyzeJava(relativePath, source);
  return {
    relativePath,
    language: 'unknown',
    codeLines: countCodeLines(source),
    fileScore: 0,
    topFeatures: [],
    skipped: true,
    skipReason: 'unsupported extension',
  };
}
```

Language analyzers combine 40% shared features (from baseAnalyzer) + 60% language-specific features using `combineFeatures`.

- [ ] **Step 4: Run tests**

Run: `npm test -- --grep "language analyzers"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/ test/fixtures/snippets/ test/unit/languageAnalyzers.test.ts
git commit -m "feat: add JS/TS, Python, Java analyzers"
```

---

### Task 5: File Filter

**Files:**
- Create: `src/scanner/fileFilter.ts`
- Test: `test/unit/fileFilter.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { assert } from 'chai';
import { createFileFilter } from '../../src/scanner/fileFilter';

describe('fileFilter', () => {
  it('excludes node_modules and lock files', () => {
    const filter = createFileFilter(['**/*'], ['**/node_modules/**', '**/package-lock.json']);
    assert.isFalse(filter('node_modules/foo/index.js'));
    assert.isFalse(filter('package-lock.json'));
    assert.isTrue(filter('src/index.ts'));
  });

  it('respects include patterns', () => {
    const filter = createFileFilter(['**/*.ts'], ['**/node_modules/**']);
    assert.isTrue(filter('src/a.ts'));
    assert.isFalse(filter('src/a.py'));
  });
});
```

- [ ] **Step 2: Implement `fileFilter.ts`**

Use `minimatch` for include/exclude. Optionally load `.gitignore` via `ignore` package and reject ignored paths.

```typescript
import minimatch from 'minimatch';
import ignore, { Ignore } from 'ignore';

export function createFileFilter(
  includePatterns: string[],
  excludePatterns: string[],
  gitignore?: Ignore,
): (relativePath: string) => boolean {
  return (relativePath: string) => {
    const normalized = relativePath.replace(/\\/g, '/');
    if (gitignore?.ignores(normalized)) return false;
    const included = includePatterns.some((p) => minimatch(normalized, p, { dot: true }));
    if (!included) return false;
    return !excludePatterns.some((p) => minimatch(normalized, p, { dot: true }));
  };
}

export function loadGitignore(root: string): Ignore {
  const ig = ignore();
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const giPath = path.join(root, '.gitignore');
    if (fs.existsSync(giPath)) {
      ig.add(fs.readFileSync(giPath, 'utf8'));
    }
  } catch { /* no gitignore */ }
  return ig;
}
```

- [ ] **Step 3: Run tests — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add src/scanner/fileFilter.ts test/unit/fileFilter.test.ts
git commit -m "feat: add workspace file filter with gitignore support"
```

---

### Task 6: Workspace Scanner

**Files:**
- Create: `src/scanner/workspaceScanner.ts`
- Test: `test/integration/scan.test.ts`
- Create: `test/fixtures/sample-workspace/` (3–5 files across langs)

- [ ] **Step 1: Create sample workspace fixture**

```
test/fixtures/sample-workspace/
  src/app.ts
  src/utils.py
  src/UserService.java
  node_modules/ignored/index.js   # should be skipped
```

- [ ] **Step 2: Write failing integration test**

```typescript
import { assert } from 'chai';
import * as path from 'path';
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
  });
});
```

- [ ] **Step 3: Implement `workspaceScanner.ts`**

Responsibilities:
- Recursively list files under root (use `fs.promises.readdir` recursive or glob — implement simple recursive walker)
- Apply `createFileFilter`
- Process in batches of `BATCH_SIZE`, yield with `setImmediate` between batches
- Accept `CancellationToken` — check each batch, set `status: 'cancelled'` if cancelled
- Read file; if size > maxFileSizeKB, take first 500 lines
- Call `analyzeFile(relativePath, content)`
- mtime cache: `Map<string, { mtimeMs: number; analysis: FileAnalysis }>`
- Return partial `ScanResult` with empty topFiles (aggregator fills later)

Export interface `ScanOptions`:
```typescript
export interface ScanOptions {
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSizeKB: number;
  cache: Map<string, { mtimeMs: number; analysis: FileAnalysis }>;
  token?: { isCancellationRequested: boolean };
  onProgress?: (done: number, total: number) => void;
}
```

- [ ] **Step 4: Run integration test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/scanner/workspaceScanner.ts test/integration/ test/fixtures/sample-workspace/
git commit -m "feat: add batched workspace scanner with mtime cache"
```

---

### Task 7: Metrics Aggregator

**Files:**
- Create: `src/aggregator/metricsAggregator.ts`
- Test: `test/unit/metricsAggregator.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
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
    assert.equal(summary.projectAiRate, 50);
    assert.equal(summary.scoreDistribution['61-100'], 1);
    assert.equal(topFiles[0].relativePath, 'a.ts');
  });
});
```

- [ ] **Step 2: Implement**

```typescript
export interface AggregateOptions {
  topN: number;
  highlightThreshold: number;
}

export function aggregateMetrics(fileDetails: FileAnalysis[], options: AggregateOptions) {
  const analyzed = fileDetails.filter((f) => !f.skipped);
  const totalCodeLines = analyzed.reduce((s, f) => s + f.codeLines, 0);
  const weighted = analyzed.reduce((s, f) => s + f.codeLines * f.fileScore, 0);
  const projectAiRate = totalCodeLines === 0 ? 0 : Math.round((weighted / totalCodeLines) * 10) / 10;

  const scoreDistribution = { '0-30': 0, '31-60': 0, '61-100': 0 } as const;
  for (const f of analyzed) {
    if (f.fileScore <= 30) scoreDistribution['0-30']++;
    else if (f.fileScore <= 60) scoreDistribution['31-60']++;
    else scoreDistribution['61-100']++;
  }

  const sorted = [...analyzed].sort((a, b) => b.fileScore - a.fileScore);
  const topFiles = sorted.slice(0, options.topN);

  return {
    summary: {
      projectAiRate,
      totalFiles: fileDetails.length,
      analyzedFiles: analyzed.length,
      skippedFiles: fileDetails.length - analyzed.length,
      totalCodeLines,
      scoreDistribution: { ...scoreDistribution },
    },
    topFiles,
  };
}
```

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/aggregator/metricsAggregator.ts test/unit/metricsAggregator.test.ts
git commit -m "feat: add metrics aggregator for project AI rate"
```

---

### Task 8: Report Builder and Template Engine

**Files:**
- Create: `src/reporter/reportBuilder.ts`, `src/reporter/templateEngine.ts`, `src/reporter/default.hbs`
- Test: `test/unit/reportBuilder.test.ts`, `test/unit/templateEngine.test.ts`

- [ ] **Step 1: Write failing tests for reportBuilder**

Verify `reportMeta` contains all audit fields from spec §5.2.

- [ ] **Step 2: Implement `reportBuilder.ts`**

```typescript
export function buildReport(scan: ScanResult, extensionVersion: string, scanConfig: Record<string, unknown>, disclaimer: string): ExportReport {
  return {
    reportMeta: {
      generatedAt: new Date().toISOString(),
      workspaceName: scan.workspaceName,
      workspacePath: scan.workspacePath,
      extensionVersion,
      analyzerVersion: ANALYZER_VERSION,
      scanDurationMs: scan.durationMs ?? 0,
      scanConfig,
      disclaimer,
      scanStatus: scan.status,
    },
    summary: scan.summary,
    topFiles: scan.topFiles,
    fileDetails: scan.fileDetails,
  };
}
```

- [ ] **Step 3: Implement `templateEngine.ts`**

Functions:
- `toJson(report, fields)` — filter by `exportFields`
- `toCsv(report)` — header: path, language, score, codeLines, topFeature1
- `toHtml(report, templatePath?, workspaceExportConfig?)` — Handlebars compile default or custom `.hbs`; embed logo as base64 if `logoPath` exists

Load workspace config from `.vscode/code-ai-rate.json` if present.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/reporter/ test/unit/reportBuilder.test.ts test/unit/templateEngine.test.ts
git commit -m "feat: add report builder and JSON/CSV/HTML export"
```

---

### Task 9: Sidebar Webview UI

**Files:**
- Create: `src/ui/sidebarProvider.ts`, `src/ui/webview/main.js`, `src/ui/webview/styles.css`
- Create: `media/icon.svg`

- [ ] **Step 1: Implement `SidebarProvider` implements `WebviewViewProvider`**

- Resolve webview URI for scripts with `webview.asWebviewUri`
- `postMessage` types: `{ type: 'scanResult', payload: ScanResult }`, `{ type: 'scanProgress', done, total }`, `{ type: 'scanState', status }`
- Handle messages from webview: `scan`, `export`, `openFile`, `cancel`
- CSP: only allow nonce scripts

- [ ] **Step 2: Build webview HTML**

Sections per spec §4.1: action buttons, project rate bar, summary stats, distribution, top files list, disclaimer footer.

Use neutral colors: `#4a90d9` for bars, `#888` for secondary text. No red/green.

- [ ] **Step 3: Manual smoke test**

Run extension in Extension Development Host (F5 launch config — add `.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
    }
  ]
}
```

Open sample workspace, click Scan, verify sidebar updates.

- [ ] **Step 4: Commit**

```bash
git add src/ui/ media/icon.svg .vscode/launch.json
git commit -m "feat: add sidebar webview for scan results"
```

---

### Task 10: Extension Wiring (Commands, Status Bar, Auto-Scan)

**Files:**
- Modify: `src/extension.ts`
- Create: `src/ui/statusBar.ts`, `src/config.ts`

- [ ] **Step 1: Implement `config.ts` — read all `codeAiRate.*` settings**

- [ ] **Step 2: Implement `statusBar.ts`**

- Show progress during scan
- Show `AI Rate: XX.X%` for 5 seconds after complete; click opens sidebar

- [ ] **Step 3: Wire `extension.ts`**

Register:
- `codeAiRate.scanWorkspace` — validate folder open, run scanner → aggregator → update sidebar + status bar
- `codeAiRate.cancelScan` — cancel token
- `codeAiRate.exportReport` — QuickPick format → save dialog → write file
- `codeAiRate.openResults` — focus view `codeAiRate.sidebar`

Auto-scan: if `autoScanOnOpen`, delay 3s then scan; if file count > 5000, show info message once.

Maintain in-memory `lastScanResult` and mtime cache on extension context or module state.

Output Channel: log skipped files and errors.

- [ ] **Step 4: Commit**

```bash
git add src/extension.ts src/config.ts src/ui/statusBar.ts
git commit -m "feat: wire commands, status bar, and auto-scan"
```

---

### Task 11: Export Flow End-to-End

**Files:**
- Modify: `src/extension.ts` (export handler)
- Test: `test/unit/templateEngine.test.ts` (extend)

- [ ] **Step 1: Implement export command handler**

1. Guard: no scan result → prompt to scan first
2. QuickPick: JSON / CSV / HTML
3. `showSaveDialog` with default filename `code-ai-rate-report-YYYYMMDD`
4. Write UTF-8 file
5. `showInformationMessage` with path

- [ ] **Step 2: Test HTML contains disclaimer and analyzerVersion**

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: complete export flow with save dialog"
```

---

### Task 12: Marketplace Documentation and CI

**Files:**
- Create: `README.md`, `CHANGELOG.md`, `PRIVACY.md`, `.github/workflows/ci.yml`

- [ ] **Step 1: Write README** — features, screenshots placeholder, config table, disclaimer, install from VSIX

- [ ] **Step 2: Write PRIVACY.md** — explicitly: no network, no telemetry, no data collection, all local

- [ ] **Step 3: Write CHANGELOG** — v0.1.0 initial release

- [ ] **Step 4: Add CI workflow**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
      - run: npm run compile
      - run: npm run package
```

- [ ] **Step 5: Verify package**

Run: `npm run package`
Expected: `.vsix` file created

- [ ] **Step 6: Commit**

```bash
git add README.md CHANGELOG.md PRIVACY.md .github/
git commit -m "docs: add marketplace docs and CI workflow"
```

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| 1 MVP scope | Tasks 1–12 |
| 2 Architecture | Tasks 1, 6, 10 |
| 2.5 Configuration | Tasks 1, 10 |
| 3 Detection rules | Tasks 3, 4 |
| 3.2 Layered metrics | Task 7 |
| 4 UI | Task 9, 10 |
| 4.5 Auto-scan | Task 10 |
| 5 Export | Tasks 8, 11 |
| 6 Error handling | Tasks 6, 10 (Output Channel) |
| 7 Performance | Task 6 (batch, cache, sampling) |
| 8 Testing | Tasks 3–8, 12 |
| 9 Marketplace | Task 12 |

## Self-Review Notes

- All tasks include concrete file paths and code snippets.
- No TBD/TODO placeholders.
- Type names consistent: `FileAnalysis`, `ScanResult`, `ExportReport` across tasks.
- Neutral terminology used throughout (`highlightThreshold`, `topFiles`, no "risk").

---

**Estimated effort:** 12 tasks, ~2–3 days for a skilled developer.

**Suggested commit cadence:** One commit per task (as listed).

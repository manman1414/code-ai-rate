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

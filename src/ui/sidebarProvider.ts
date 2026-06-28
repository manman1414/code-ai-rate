/**
 * 侧边栏 Webview 提供者
 * @author Cursor Agent
 * @date 2026-06-28
 */

import * as vscode from 'vscode';
import { ScanResult, ScanStatus } from '../types';

/** 扫描触发回调（由 extension 在 Task 10 中接入） */
export type ScanCallback = () => void | Promise<void>;
/** 导出报告回调 */
export type ExportCallback = () => void | Promise<void>;
/** 取消扫描回调 */
export type CancelCallback = () => void | Promise<void>;
/** 打开文件回调 */
export type OpenFileCallback = (relativePath: string) => void | Promise<void>;

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codeAiRate.sidebar';

  private view?: vscode.WebviewView;
  private onScanCallback?: ScanCallback;
  private onExportCallback?: ExportCallback;
  private onCancelCallback?: CancelCallback;
  private onOpenFileCallback?: OpenFileCallback;
  private workspacePath = '';

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** 注册扫描回调 */
  setOnScan(callback: ScanCallback): void {
    this.onScanCallback = callback;
  }

  /** 注册导出回调 */
  setOnExport(callback: ExportCallback): void {
    this.onExportCallback = callback;
  }

  /** 注册取消回调 */
  setOnCancel(callback: CancelCallback): void {
    this.onCancelCallback = callback;
  }

  /** 注册打开文件回调 */
  setOnOpenFile(callback: OpenFileCallback): void {
    this.onOpenFileCallback = callback;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    const nonce = getNonce();
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview, nonce);

    webviewView.webview.onDidReceiveMessage(async (message: { type: string; relativePath?: string }) => {
      switch (message.type) {
        case 'scan':
          await vscode.commands.executeCommand('codeAiRate.scanWorkspace');
          break;
        case 'export':
          await vscode.commands.executeCommand('codeAiRate.exportReport');
          break;
        case 'cancel':
          await vscode.commands.executeCommand('codeAiRate.cancelScan');
          break;
        case 'openFile':
          if (message.relativePath && this.onOpenFileCallback) {
            await this.onOpenFileCallback(message.relativePath);
          }
          break;
      }
    });

    if (this.pendingScanResult) {
      this.postScanResult(this.pendingScanResult);
    }
  }

  private pendingScanResult?: ScanResult;

  /** 缓存并在 webview 就绪后推送扫描结果 */
  postScanResult(result: ScanResult): void {
    this.pendingScanResult = result;
    this.workspacePath = result.workspacePath;
    this.postMessage({ type: 'scanResult', payload: result });
  }

  /** 向 webview 推送扫描进度 */
  postScanProgress(done: number, total: number): void {
    this.postMessage({ type: 'scanProgress', done, total });
  }

  /** 向 webview 推送扫描状态 */
  postScanState(status: ScanStatus): void {
    this.postMessage({ type: 'scanState', status });
  }

  private postMessage(message: unknown): void {
    void this.view?.webview.postMessage(message);
  }

  private getHtmlForWebview(webview: vscode.Webview, nonce: string): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'styles.css'),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'main.js'),
    );

    const disclaimer =
      vscode.workspace.getConfiguration('codeAiRate').get<string>('disclaimerText') ??
      '本报告基于启发式统计，仅供参考，不构成任何判定依据。';

    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource}`,
      `script-src ${webview.cspSource} 'nonce-${nonce}'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>AI Rate</title>
</head>
<body>
  <div class="container">
    <header class="actions">
      <button id="btn-scan" class="btn btn-primary">开始扫描</button>
      <button id="btn-export" class="btn btn-secondary" disabled>导出报告</button>
      <button id="btn-cancel" class="btn btn-secondary hidden">取消扫描</button>
    </header>

    <section id="scan-progress" class="scan-progress hidden">
      <div class="progress-bar">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
      <p class="progress-text">
        已分析 <span id="progress-done">0</span> / <span id="progress-total">0</span>
      </p>
    </section>

    <section class="rate-section">
      <h2 class="section-title">项目 AI 率</h2>
      <div class="rate-display">
        <span id="project-rate" class="rate-value">—</span>
        <span class="rate-unit">%</span>
      </div>
      <div class="rate-bar">
        <div id="rate-fill" class="rate-fill"></div>
      </div>
      <p id="workspace-name" class="workspace-name"></p>
    </section>

    <section class="stats-section">
      <h3 class="section-title">扫描概况</h3>
      <dl class="stats-grid">
        <div class="stat-item">
          <dt>文件数</dt>
          <dd id="stat-files">—</dd>
        </div>
        <div class="stat-item">
          <dt>代码行数</dt>
          <dd id="stat-lines">—</dd>
        </div>
        <div class="stat-item">
          <dt>已分析</dt>
          <dd id="stat-analyzed">—</dd>
        </div>
        <div class="stat-item">
          <dt>已跳过</dt>
          <dd id="stat-skipped">—</dd>
        </div>
      </dl>
    </section>

    <section class="distribution-section">
      <h3 class="section-title">分数分布</h3>
      <div class="distribution-list">
        <div class="distribution-row">
          <span class="distribution-label">0–30</span>
          <div class="distribution-bar">
            <div id="dist-0-30" class="distribution-fill"></div>
          </div>
          <span id="count-0-30" class="distribution-count">0</span>
        </div>
        <div class="distribution-row">
          <span class="distribution-label">31–60</span>
          <div class="distribution-bar">
            <div id="dist-31-60" class="distribution-fill"></div>
          </div>
          <span id="count-31-60" class="distribution-count">0</span>
        </div>
        <div class="distribution-row">
          <span class="distribution-label">61–100</span>
          <div class="distribution-bar">
            <div id="dist-61-100" class="distribution-fill"></div>
          </div>
          <span id="count-61-100" class="distribution-count">0</span>
        </div>
      </div>
    </section>

    <section class="top-files-section">
      <h3 class="section-title">AI 占比较高文件</h3>
      <ul id="top-files-list" class="top-files-list">
        <li class="empty-hint">暂无数据，请先扫描工作区</li>
      </ul>
    </section>

    <footer class="disclaimer">
      <p id="disclaimer-text">${escapeHtml(disclaimer)}</p>
    </footer>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/** 生成 CSP nonce */
function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

/** HTML 转义，防止免责声明注入 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 状态栏扫描进度与结果展示
 * @author Cursor Agent
 * @date 2026-06-28
 */

import * as vscode from 'vscode';

const RESULT_DISPLAY_MS = 5000;

/** 管理状态栏 AI Rate 指示器 */
export class StatusBar {
  private readonly item: vscode.StatusBarItem;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'codeAiRate.openResults';
    this.item.tooltip = '点击查看 AI Rate 扫描结果';
  }

  /** 注册到扩展生命周期 */
  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.item);
  }

  /** 扫描中显示进度百分比 */
  showScanProgress(percent: number): void {
    this.clearHideTimer();
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    this.item.text = `$(sync~spin) AI Rate: ${clamped}%`;
    this.item.show();
  }

  /** 扫描完成后显示 AI 率，5 秒后自动隐藏 */
  showResult(rate: number): void {
    this.clearHideTimer();
    this.item.text = `AI Rate: ${rate.toFixed(1)}%`;
    this.item.show();
    this.hideTimer = setTimeout(() => {
      this.item.hide();
      this.hideTimer = undefined;
    }, RESULT_DISPLAY_MS);
  }

  /** 隐藏状态栏项 */
  hide(): void {
    this.clearHideTimer();
    this.item.hide();
  }

  dispose(): void {
    this.clearHideTimer();
    this.item.dispose();
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== undefined) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }
}

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Code AI Rate');
  output.appendLine('Code AI Rate activated');
}

export function deactivate(): void {}

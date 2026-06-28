import * as vscode from 'vscode';
import { SidebarProvider } from './ui/sidebarProvider';

export function activate(context: vscode.ExtensionContext): void {
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );
}

export function deactivate(): void {}

import * as path from "node:path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand("mockframe.openSelection", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
      void vscode.window.showInformationMessage("Select the code you want to send to MockFrame first.");
      return;
    }
    const code = editor.document.getText(editor.selection).slice(0, 12_000);
    const origin = vscode.workspace.getConfiguration("mockframe").get<string>("baseUrl", "https://mockframe.app").replace(/\/$/, "");
    const params = new URLSearchParams({ code, language: editor.document.languageId, filename: path.basename(editor.document.fileName) || "snippet" });
    await vscode.env.openExternal(vscode.Uri.parse(`${origin}/templates/code?${params}`));
  }));
}

export function deactivate() {}

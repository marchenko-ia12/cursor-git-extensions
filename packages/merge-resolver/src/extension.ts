import * as vscode from "vscode";
import { MergeEditorProvider } from "./mergeEditorProvider";
import { initGitWatcher } from "./gitWatcher";
import { promptForApiKey } from "./aiClient";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      MergeEditorProvider.viewType,
      new MergeEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  initGitWatcher(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("mergeResolver.setAiKey", () => promptForApiKey(context)),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("mergeResolver.open", async () => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      if (!uri) {
        vscode.window.showInformationMessage("Open a file first");
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", uri, MergeEditorProvider.viewType);
    }),
  );
}

export function deactivate() {}

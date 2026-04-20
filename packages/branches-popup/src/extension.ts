import * as vscode from "vscode";
import { openPopup } from "./branchesPopup";
import { initStatusBar } from "./statusBar";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("gitBranchSwitcher.open", openPopup),
  );
  initStatusBar(context);
}

export function deactivate() {}

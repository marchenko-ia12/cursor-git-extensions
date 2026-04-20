import * as vscode from "vscode";
import { findAllConfigs, RunConfig } from "./scripts";
import { Runner } from "./runner";
import { StatusBar } from "./statusBar";

const SELECTED_CONFIG_KEY = "jbRunner.selectedConfig";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const runner = new Runner(context);
  const statusBar = new StatusBar(context, runner);

  const syncRunningContext = () =>
    vscode.commands.executeCommand("setContext", "jbRunner.running", runner.isRunning());
  context.subscriptions.push(runner.onChanged(() => { void syncRunningContext(); }));
  void syncRunningContext();

  let selected: RunConfig | undefined = await resolveStoredSelection(context);
  await refresh();

  async function refresh(): Promise<void> {
    const all = await findAllConfigs();
    if (selected) {
      const match = all.find(c => c.id === selected!.id);
      if (!match) selected = undefined;
      else selected = match;
    }
    if (!selected && all.length > 0) {
      selected = all[0];
      await context.workspaceState.update(SELECTED_CONFIG_KEY, selected.id);
    }
    statusBar.render(selected);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => refresh()),
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (doc.fileName.endsWith("package.json")) refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("jbRunner.pickConfig", async () => {
      const all = await findAllConfigs();
      if (all.length === 0) {
        vscode.window.showWarningMessage("JB Runner: no package.json scripts found in the workspace.");
        return;
      }
      const picked = await pickFromList(all, selected);
      if (!picked) return;
      selected = picked;
      await context.workspaceState.update(SELECTED_CONFIG_KEY, picked.id);
      statusBar.render(selected);
    }),

    vscode.commands.registerCommand("jbRunner.run", async () => {
      if (!selected) {
        await vscode.commands.executeCommand("jbRunner.pickConfig");
      }
      if (!selected) return;
      await runner.start(selected);
    }),

    vscode.commands.registerCommand("jbRunner.stop", async () => {
      await runner.stop();
    }),

    vscode.commands.registerCommand("jbRunner.showOutput", () => {
      runner.showOutput();
    })
  );

  async function resolveStoredSelection(ctx: vscode.ExtensionContext): Promise<RunConfig | undefined> {
    const storedId = ctx.workspaceState.get<string>(SELECTED_CONFIG_KEY);
    if (!storedId) return undefined;
    const all = await findAllConfigs();
    return all.find(c => c.id === storedId);
  }
}

async function pickFromList(
  configs: RunConfig[],
  current: RunConfig | undefined
): Promise<RunConfig | undefined> {
  const multiplePackages = new Set(configs.map(c => c.packageName)).size > 1;
  const items: (vscode.QuickPickItem & { cfg: RunConfig })[] = configs.map(c => ({
    label: `$(play) ${c.script}`,
    description: multiplePackages ? c.packageName : undefined,
    detail: c.cwd,
    cfg: c,
    picked: current?.id === c.id,
  }));
  const pick = await vscode.window.showQuickPick(items, {
    title: "JB Runner — pick a script",
    placeHolder: current ? `Current: ${current.packageName} — ${current.script}` : "No configuration selected",
    matchOnDescription: true,
    matchOnDetail: true,
  });
  return pick?.cfg;
}

export function deactivate(): void {
  // no-op
}

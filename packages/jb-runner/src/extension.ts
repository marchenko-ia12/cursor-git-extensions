import * as vscode from "vscode";
import { findAllConfigs, RunConfig } from "./scripts";
import { Runner } from "./runner";
import { StatusBar } from "./statusBar";

const SELECTED_CONFIG_KEY = "jbRunner.selectedConfig";
const MRU_KEY = "jbRunner.mru";
const MRU_MAX = 5;

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
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("jbRunner.configurations")) refresh();
    }),
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (doc.fileName.endsWith("package.json")) refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("jbRunner.pickConfig", async () => {
      const all = await findAllConfigs();
      if (all.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          "JB Runner: no configurations found. Add a custom one?",
          "Add custom configuration"
        );
        if (choice) await vscode.commands.executeCommand("jbRunner.addConfig");
        return;
      }
      const picked = await pickFromList(all, selected, getMru(context));
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
      await bumpMru(context, selected.id);
      await runner.start(selected);
    }),

    vscode.commands.registerCommand("jbRunner.stop", async () => {
      await runner.stop();
    }),

    vscode.commands.registerCommand("jbRunner.showOutput", () => {
      runner.showOutput();
    }),

    vscode.commands.registerCommand("jbRunner.addConfig", async () => {
      await addCustomConfiguration();
      await refresh();
    }),

    vscode.commands.registerCommand("jbRunner.editConfigs", async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "jbRunner.configurations"
      );
    })
  );

  async function resolveStoredSelection(ctx: vscode.ExtensionContext): Promise<RunConfig | undefined> {
    const storedId = ctx.workspaceState.get<string>(SELECTED_CONFIG_KEY);
    if (!storedId) return undefined;
    const all = await findAllConfigs();
    return all.find(c => c.id === storedId);
  }
}

function getMru(ctx: vscode.ExtensionContext): string[] {
  return ctx.workspaceState.get<string[]>(MRU_KEY, []);
}

async function bumpMru(ctx: vscode.ExtensionContext, id: string): Promise<void> {
  const prev = getMru(ctx);
  const next = [id, ...prev.filter(x => x !== id)].slice(0, MRU_MAX);
  await ctx.workspaceState.update(MRU_KEY, next);
}

async function pickFromList(
  configs: RunConfig[],
  current: RunConfig | undefined,
  mru: string[]
): Promise<RunConfig | undefined> {
  const customConfigs = configs.filter(c => c.kind === "custom");
  const npmConfigs = configs.filter(c => c.kind === "npm");
  const multiplePackages = new Set(npmConfigs.map(c => c.packageName)).size > 1;
  const byId = new Map(configs.map(c => [c.id, c]));
  const recent = mru.map(id => byId.get(id)).filter((c): c is RunConfig => !!c);
  const recentIds = new Set(recent.map(c => c.id));
  const npmRest = npmConfigs.filter(c => !recentIds.has(c.id));
  const customRest = customConfigs.filter(c => !recentIds.has(c.id));

  type Item = vscode.QuickPickItem & { cfg?: RunConfig; addCustom?: boolean };
  const items: Item[] = [];

  const toItem = (c: RunConfig): Item => {
    if (c.kind === "custom") {
      return {
        label: `$(terminal) ${c.label}`,
        description: c.command,
        detail: c.cwd,
        cfg: c,
        picked: current?.id === c.id,
      };
    }
    return {
      label: `$(play) ${c.label}`,
      description: multiplePackages ? `${c.packageName} · ${c.packageManager}` : c.packageManager,
      detail: c.cwd,
      cfg: c,
      picked: current?.id === c.id,
    };
  };

  if (recent.length > 0) {
    items.push({ label: "Recent", kind: vscode.QuickPickItemKind.Separator });
    for (const c of recent) items.push(toItem(c));
  }
  if (customRest.length > 0) {
    items.push({ label: "Custom", kind: vscode.QuickPickItemKind.Separator });
    for (const c of customRest) items.push(toItem(c));
  }
  if (npmRest.length > 0) {
    items.push({ label: "package.json scripts", kind: vscode.QuickPickItemKind.Separator });
    for (const c of npmRest) items.push(toItem(c));
  }

  items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
  items.push({ label: "$(add) Add custom configuration…", addCustom: true });

  const pick = await vscode.window.showQuickPick(items, {
    title: "JB Runner — pick a configuration",
    placeHolder: current
      ? `Current: ${current.packageName} — ${current.label}`
      : "No configuration selected",
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (pick?.addCustom) {
    await vscode.commands.executeCommand("jbRunner.addConfig");
    return undefined;
  }
  return pick?.cfg;
}

async function addCustomConfiguration(): Promise<void> {
  const name = await vscode.window.showInputBox({
    title: "JB Runner — new configuration (1/2)",
    prompt: "Display name",
    placeHolder: "Run Python",
    validateInput: v => (v.trim() ? null : "Name is required"),
  });
  if (!name) return;

  const command = await vscode.window.showInputBox({
    title: "JB Runner — new configuration (2/2)",
    prompt: "Shell command",
    placeHolder: "make run",
    validateInput: v => (v.trim() ? null : "Command is required"),
  });
  if (!command) return;

  const scope = await pickConfigScope();
  if (!scope) return;

  const cfg = vscode.workspace.getConfiguration("jbRunner");
  const inspect = cfg.inspect<unknown[]>("configurations");
  const existing =
    scope === vscode.ConfigurationTarget.Workspace
      ? inspect?.workspaceValue
      : inspect?.globalValue;
  const prev = Array.isArray(existing) ? [...existing] : [];
  prev.push({ name: name.trim(), command: command.trim() });
  await cfg.update("configurations", prev, scope);

  vscode.window.showInformationMessage(
    `JB Runner: added "${name.trim()}". Edit settings to add cwd or env.`
  );
}

async function pickConfigScope(): Promise<vscode.ConfigurationTarget | undefined> {
  const hasWorkspace = !!vscode.workspace.workspaceFolders?.length;
  if (!hasWorkspace) return vscode.ConfigurationTarget.Global;

  const pick = await vscode.window.showQuickPick(
    [
      {
        label: "Workspace",
        description: ".vscode/settings.json (shared via git)",
        target: vscode.ConfigurationTarget.Workspace,
      },
      {
        label: "User",
        description: "Global settings (only for you)",
        target: vscode.ConfigurationTarget.Global,
      },
    ],
    { title: "Save configuration to", placeHolder: "Where to store this configuration?" }
  );
  return pick?.target;
}

export function deactivate(): void {
  // no-op
}

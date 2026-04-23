import * as vscode from "vscode";
import { getGitApi, Repo, GitAPI } from "./gitApi";
import { smartPull } from "./actions";

export async function initStatusBar(context: vscode.ExtensionContext): Promise<void> {
  const branchItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  branchItem.command = "gitBranchSwitcher.open";
  branchItem.name = "Git Branch Switcher";
  context.subscriptions.push(branchItem);

  const updateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  updateItem.command = "gitBranchSwitcher.updateCurrent";
  updateItem.name = "Update Current Branch";
  context.subscriptions.push(updateItem);

  const api = await getGitApi();
  if (!api) {
    branchItem.text = "$(git-branch) no git";
    branchItem.tooltip = "Built-in Git extension unavailable";
    branchItem.show();
    return;
  }

  const update = () => {
    const repo = pickActiveRepo(api.repositories);
    if (!repo) {
      branchItem.hide();
      updateItem.hide();
      return;
    }
    const head = repo.state.HEAD;
    const label = head?.name ?? (head?.commit ? head.commit.slice(0, 7) : "detached");
    branchItem.text = `$(git-branch) ${label}`;
    branchItem.tooltip = `Repository: ${repo.rootUri.fsPath}\nClick to open branches popup`;
    branchItem.show();

    const behind = head?.behind ?? 0;
    const ahead = head?.ahead ?? 0;
    const counts: string[] = [];
    if (behind > 0) counts.push(`↓${behind}`);
    if (ahead > 0) counts.push(`↑${ahead}`);
    updateItem.text = counts.length ? `$(sync) ${counts.join(" ")}` : "$(sync)";
    const upstream = head?.upstream ? `${head.upstream.remote}/${head.upstream.name}` : "upstream";
    if (behind > 0 && ahead > 0) {
      updateItem.tooltip = `${behind} behind, ${ahead} ahead of ${upstream}. Click to fetch & pull.`;
    } else if (behind > 0) {
      updateItem.tooltip = `${behind} behind ${upstream}. Click to pull.`;
    } else if (ahead > 0) {
      updateItem.tooltip = `${ahead} ahead of ${upstream}. Click to fetch & check for updates.`;
    } else {
      updateItem.tooltip = `In sync with ${upstream}. Click to fetch & check for updates.`;
    }
    updateItem.backgroundColor = behind > 0
      ? new vscode.ThemeColor("statusBarItem.warningBackground")
      : undefined;
    updateItem.show();
  };

  const subscribe = (repo: Repo) => {
    context.subscriptions.push(repo.state.onDidChange(update));
  };
  for (const r of api.repositories) subscribe(r);
  context.subscriptions.push(api.onDidOpenRepository((r) => { subscribe(r); update(); }));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(update));

  context.subscriptions.push(
    vscode.commands.registerCommand("gitBranchSwitcher.updateCurrent", () => updateCurrent(api)),
  );

  silentFetchAll(api);
  update();
}

async function silentFetchAll(api: GitAPI): Promise<void> {
  await Promise.allSettled(api.repositories.map((r) => r.fetch().catch(() => {})));
}

async function updateCurrent(api: GitAPI): Promise<void> {
  const repo = pickActiveRepo(api.repositories);
  if (!repo) return;
  try {
    await repo.fetch();
    const behind = repo.state.HEAD?.behind ?? 0;
    const ahead = repo.state.HEAD?.ahead ?? 0;
    if (behind === 0 && ahead === 0) {
      vscode.window.showInformationMessage("Already up to date.");
      return;
    }
    await smartPull(repo);
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    vscode.window.showErrorMessage(`Update failed: ${err.stderr?.trim() ?? err.message ?? String(e)}`);
  }
}

function pickActiveRepo(repos: Repo[]): Repo | undefined {
  if (repos.length === 0) return undefined;
  if (repos.length === 1) return repos[0];
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active) {
    const match = repos.find((r) => active.fsPath.startsWith(r.rootUri.fsPath));
    if (match) return match;
  }
  return repos[0];
}

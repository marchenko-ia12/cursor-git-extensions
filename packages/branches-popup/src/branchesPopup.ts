import * as vscode from "vscode";
import { getGitApi, pickActiveRepo, scanWorkspaceRepos, Repo, Branch, GitAPI } from "./gitApi";
import { runAction, ActionKind, newBranchFromHead } from "./actions";

interface BranchItem extends vscode.QuickPickItem {
  branch: Branch;
}

interface ActionItem extends vscode.QuickPickItem {
  actionKind: ActionKind;
}

interface BackItem extends vscode.QuickPickItem {
  back: true;
}

interface NewBranchItem extends vscode.QuickPickItem {
  newBranch: true;
}

interface RepoItem extends vscode.QuickPickItem {
  repo: Repo;
}

type Mode = "branches" | "actions";

function repoName(r: Repo): string {
  return r.rootUri.fsPath.split("/").pop() ?? r.rootUri.fsPath;
}

const REPO_DOTS = ["🔴", "🔵", "🟢", "🟡", "🟠", "🟣"];

function dotAt(idx: number): string {
  return REPO_DOTS[((idx % REPO_DOTS.length) + REPO_DOTS.length) % REPO_DOTS.length];
}

export async function openPopup(): Promise<void> {
  const api = await getGitApi();
  if (!api) {
    vscode.window.showErrorMessage("Built-in Git extension is not available.");
    return;
  }
  await scanWorkspaceRepos(api);
  if (api.repositories.length === 0) {
    vscode.window.showWarningMessage("No git repositories found in workspace.");
    return;
  }
  const initial = pickActiveRepo(api);
  if (!initial) return;

  let currentRepo: Repo = initial;
  const getCurrentBranch = () => currentRepo.state.HEAD?.name;

  const refreshBtn: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("refresh"),
    tooltip: "Fetch remotes",
  };

  const qp = vscode.window.createQuickPick<BranchItem | ActionItem | NewBranchItem | RepoItem | BackItem | vscode.QuickPickItem>();
  qp.matchOnDescription = true;

  let mode: Mode = "branches";
  let branchItems: (BranchItem | NewBranchItem | RepoItem | vscode.QuickPickItem)[] = [];
  let selectedBranch: Branch | undefined;
  let pickedAction: ActionKind | undefined;
  let pickedNewBranch = false;

  const updateTitle = () => {
    const cb = getCurrentBranch();
    qp.title = `Branches · ${repoName(currentRepo)}${cb ? " · " + cb : ""}`;
  };

  const reload = async () => {
    branchItems = await buildBranchItems(api, currentRepo, getCurrentBranch());
    if (mode === "branches") qp.items = branchItems;
  };
  const fetchAndReload = async () => {
    qp.busy = true;
    try { await currentRepo.fetch(); } catch { /* ignore */ }
    await reload();
    qp.busy = false;
  };

  const enterBranches = () => {
    mode = "branches";
    selectedBranch = undefined;
    updateTitle();
    qp.placeholder = "Pick a branch";
    qp.value = "";
    qp.items = branchItems;
    qp.buttons = [refreshBtn];
  };

  const enterActions = (branch: Branch) => {
    mode = "actions";
    selectedBranch = branch;
    const cb = getCurrentBranch();
    qp.title = `${branch.name}${branch.name === cb ? " (current)" : ""} · ${repoName(currentRepo)}`;
    qp.placeholder = "Pick an action";
    qp.value = "";
    qp.items = buildActions(branch, cb);
    qp.buttons = [];
  };

  const switchRepo = async (r: Repo) => {
    if (r === currentRepo) return;
    currentRepo = r;
    await reload();
    enterBranches();
  };

  enterBranches();

  qp.onDidTriggerButton((b) => {
    if (b === refreshBtn) void fetchAndReload();
  });

  qp.onDidAccept(() => {
    const sel = qp.selectedItems[0];
    if (!sel) return;
    if (mode === "branches") {
      if ("repo" in sel) { void switchRepo((sel as RepoItem).repo); return; }
      if ("newBranch" in sel) { pickedNewBranch = true; qp.hide(); return; }
      if ("branch" in sel) { enterActions((sel as BranchItem).branch); return; }
    } else {
      if ("back" in sel) { enterBranches(); return; }
      if ("actionKind" in sel) {
        pickedAction = (sel as ActionItem).actionKind;
        qp.hide();
      }
    }
  });

  await reload();
  qp.show();
  void fetchAndReload();
  await new Promise<void>((resolve) => qp.onDidHide(() => { qp.dispose(); resolve(); }));

  if (pickedNewBranch) {
    await newBranchFromHead(currentRepo);
    return;
  }
  if (pickedAction && selectedBranch) {
    await runAction(pickedAction, { repo: currentRepo, branch: selectedBranch, currentBranch: getCurrentBranch() });
  }
}

async function buildBranchItems(
  api: GitAPI,
  repo: Repo,
  currentBranch: string | undefined,
): Promise<(BranchItem | NewBranchItem | RepoItem | vscode.QuickPickItem)[]> {
  const [local, remote] = await Promise.all([
    repo.getBranches({ remote: false }),
    repo.getBranches({ remote: true }),
  ]);

  const items: (BranchItem | NewBranchItem | RepoItem | vscode.QuickPickItem)[] = [];

  const repos = api.repositories;
  const activeIdx = repos.findIndex((r) => r.rootUri.fsPath === repo.rootUri.fsPath);
  if (repos.length > 1) {
    items.push({ label: "Repositories", kind: vscode.QuickPickItemKind.Separator });
    repos.forEach((r, i) => {
      const isActive = i === activeIdx;
      const head = r.state.HEAD?.name ?? "(detached)";
      items.push({
        label: `${dotAt(i)} ${repoName(r)}${isActive ? " (active)" : ""}`,
        description: `${head}${isActive ? "" : " ›"}`,
        detail: r.rootUri.fsPath,
        repo: r,
      });
    });
    items.push({ label: `Branches · ${repoName(repo)}`, kind: vscode.QuickPickItemKind.Separator });
  }

  const multi = repos.length > 1;
  const dot = multi ? `${dotAt(activeIdx < 0 ? 0 : activeIdx)} ` : "";
  items.push({
    label: `${dot}$(plus) New Branch`,
    description: `from ${currentBranch ?? "HEAD"}`,
    newBranch: true,
  });
  const current = local.find((b) => b.name === currentBranch);
  if (current) {
    items.push({ label: "Current", kind: vscode.QuickPickItemKind.Separator });
    items.push(makeBranchItem(current, true, dot));
  }
  const others = local.filter((b) => b.name !== currentBranch);
  if (others.length) {
    items.push({ label: "Local branches", kind: vscode.QuickPickItemKind.Separator });
    for (const b of others) items.push(makeBranchItem(b, false, dot));
  }
  if (remote.length) {
    items.push({ label: "Remote branches", kind: vscode.QuickPickItemKind.Separator });
    for (const b of remote) items.push(makeBranchItem(b, false, dot));
  }
  return items;
}

function makeBranchItem(b: Branch, isCurrent: boolean, dot: string): BranchItem {
  const parts: string[] = [];
  if (b.upstream) parts.push(`→ ${b.upstream.remote}/${b.upstream.name}`);
  if (b.ahead) parts.push(`↑${b.ahead}`);
  if (b.behind) parts.push(`↓${b.behind}`);
  parts.push("›");
  const prefix = dot ? `${dot}${isCurrent ? "$(check)" : "$(git-branch)"} ` : `${isCurrent ? "$(check) " : "$(git-branch) "}`;
  return {
    label: `${prefix}${b.name}`,
    description: parts.join(" "),
    branch: b,
  };
}

function buildActions(branch: Branch, currentBranch: string | undefined): (ActionItem | BackItem | vscode.QuickPickItem)[] {
  const isCurrent = branch.name === currentBranch;
  const isRemote = branch.type === "remote";
  const items: (ActionItem | BackItem | vscode.QuickPickItem)[] = [];

  items.push({ label: "$(arrow-left) Back to branches", back: true } as BackItem);
  items.push({ label: branch.name, kind: vscode.QuickPickItemKind.Separator });

  if (!isCurrent) {
    items.push({ label: "$(git-branch) Checkout", actionKind: "checkout" });
  }
  if (isCurrent) {
    items.push({ label: "$(cloud-download) Update (fetch + pull)", actionKind: "update" });
  } else if (!isRemote && branch.upstream) {
    items.push({ label: "$(cloud-download) Update (fast-forward from upstream)", actionKind: "update" });
  }

  if (!isRemote) {
    const pushLabel = branch.upstream
      ? `$(cloud-upload) Push${branch.ahead ? ` (↑${branch.ahead})` : ""}`
      : "$(cloud-upload) Push (set upstream…)";
    items.push({ label: pushLabel, actionKind: "push" });
  }
  if (isCurrent || (!isRemote && branch.upstream)) {
    items.push({ label: `$(cloud-download) Pull${branch.behind ? ` (↓${branch.behind})` : ""}`, actionKind: "pull" });
  }

  if (!isCurrent) {
    items.push({ label: `$(git-merge) Merge into ${currentBranch ?? "HEAD"}`, actionKind: "merge" });
    items.push({ label: `$(debug-step-back) Rebase ${currentBranch ?? "HEAD"} onto ${branch.name}`, actionKind: "rebase" });
    items.push({ label: `$(diff) Compare with ${currentBranch ?? "HEAD"}`, actionKind: "compare" });
  }
  items.push({ label: "$(history) Show log", actionKind: "log" });

  if (!isRemote) {
    items.push({ label: "$(pencil) Rename", actionKind: "rename" });
  }
  if (!isCurrent) {
    items.push({ label: "$(trash) Delete", actionKind: "delete" });
  }
  items.push({ label: "$(plus) New branch from here", actionKind: "newFrom" });

  return items;
}

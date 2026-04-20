import * as vscode from "vscode";
import { Branch, Repo, runGit } from "./gitApi";

export type ActionKind = "checkout" | "update" | "merge" | "rebase" | "delete" | "newFrom" | "rename" | "push" | "pull" | "log" | "compare";

export interface ActionContext {
  repo: Repo;
  branch: Branch;
  currentBranch: string | undefined;
}

export async function runAction(kind: ActionKind, ctx: ActionContext): Promise<void> {
  try {
    switch (kind) {
      case "checkout": return await checkout(ctx);
      case "update": return await update(ctx);
      case "merge": return await merge(ctx);
      case "rebase": return await rebase(ctx);
      case "delete": return await deleteBranch(ctx);
      case "newFrom": return await newFrom(ctx);
      case "rename": return await rename(ctx);
      case "push": return await push(ctx);
      case "pull": return await pull(ctx);
      case "log": return await showLog(ctx);
      case "compare": return await compareWithCurrent(ctx);
    }
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const detail = err.stderr?.trim() || err.stdout?.trim() || err.message || String(e);
    vscode.window.showErrorMessage(`${kind} failed: ${detail}`, { modal: false });
  }
}

async function checkout({ repo, branch }: ActionContext): Promise<void> {
  if (branch.type === "remote") {
    const short = branch.name.replace(/^[^/]+\//, "");
    const existing = (await repo.getBranches({ remote: false })).find((b) => b.name === short);
    if (existing) {
      await repo.checkout(short);
    } else {
      await repo.createBranch(short, true, branch.name);
    }
  } else {
    await repo.checkout(branch.name);
  }
  vscode.window.showInformationMessage(`Checked out ${branch.name}`);
}

async function update({ repo, branch, currentBranch }: ActionContext): Promise<void> {
  if (branch.name === currentBranch) {
    await repo.fetch();
    await repo.pull();
    vscode.window.showInformationMessage(`Updated ${branch.name}`);
    return;
  }
  if (!branch.upstream) {
    vscode.window.showWarningMessage(`${branch.name} has no upstream.`);
    return;
  }
  await runGit(repo, ["fetch", branch.upstream.remote, `${branch.upstream.name}:${branch.name}`]);
  vscode.window.showInformationMessage(`Fast-forwarded ${branch.name}`);
}

async function merge({ repo, branch, currentBranch }: ActionContext): Promise<void> {
  await tryWithAutoStash(repo, `merge ${branch.name}`, async () => {
    const res = await runGit(repo, ["merge", "--no-edit", branch.name]);
    reportOutcome(res, `Merged ${branch.name} into ${currentBranch}`);
  });
}

async function rebase({ repo, branch, currentBranch }: ActionContext): Promise<void> {
  await tryWithAutoStash(repo, `rebase onto ${branch.name}`, async () => {
    const res = await runGit(repo, ["rebase", branch.name]);
    reportOutcome(res, `Rebased ${currentBranch} onto ${branch.name}`);
  });
}

async function tryWithAutoStash(repo: Repo, opLabel: string, op: () => Promise<void>): Promise<void> {
  try {
    await op();
    return;
  } catch (e) {
    const err = e as { stderr?: string };
    const msg = err.stderr ?? "";
    const isDirtyErr = /would be overwritten|local changes|uncommitted/i.test(msg);
    if (!isDirtyErr) throw e;

    const choice = await vscode.window.showErrorMessage(
      `Cannot ${opLabel}: uncommitted changes would be overwritten. Stash them and continue?`,
      { modal: true },
      "Stash & Continue",
    );
    if (choice !== "Stash & Continue") return;
  }

  await runGit(repo, ["stash", "push", "-u", "-m", `auto-stash for ${opLabel}`]);
  try {
    await op();
  } finally {
    const pop = await runGit(repo, ["stash", "pop"]);
    const out = (pop.stdout + pop.stderr).trim();
    if (/conflict/i.test(out)) {
      vscode.window.showWarningMessage("Stashed changes restored with conflicts — resolve them with Merge Resolver.");
    }
  }
}

function reportOutcome(res: { stdout: string; stderr: string }, successMsg: string): void {
  const out = (res.stdout + res.stderr).trim();
  if (/conflict/i.test(out)) {
    vscode.window.showWarningMessage("Conflicts detected — resolve them to continue.");
  } else {
    vscode.window.showInformationMessage(successMsg);
  }
}

async function deleteBranch({ repo, branch, currentBranch }: ActionContext): Promise<void> {
  if (branch.name === currentBranch) {
    vscode.window.showWarningMessage("Cannot delete the currently checked-out branch.");
    return;
  }
  if (branch.type === "remote") {
    const choice = await vscode.window.showWarningMessage(
      `Delete remote branch ${branch.name}? This will push the deletion.`,
      { modal: true },
      "Delete Remote",
    );
    if (choice !== "Delete Remote") return;
    const [remote, ...rest] = branch.name.split("/");
    await runGit(repo, ["push", remote, "--delete", rest.join("/")]);
  } else {
    const choice = await vscode.window.showWarningMessage(
      `Delete branch ${branch.name}?`,
      { modal: true },
      "Delete",
      "Force Delete",
    );
    if (!choice) return;
    await repo.deleteBranch(branch.name, choice === "Force Delete");
  }
  vscode.window.showInformationMessage(`Deleted ${branch.name}`);
}

async function newFrom({ repo, branch }: ActionContext): Promise<void> {
  const name = await vscode.window.showInputBox({
    title: `New branch from ${branch.name}`,
    prompt: "Branch name",
    validateInput: (v) => (!v.trim() ? "Name required" : /\s/.test(v) ? "No spaces" : null),
  });
  if (!name) return;
  await repo.createBranch(name.trim(), true, branch.name);
  vscode.window.showInformationMessage(`Created ${name} from ${branch.name}`);
}

async function rename({ repo, branch }: ActionContext): Promise<void> {
  if (branch.type === "remote") {
    vscode.window.showWarningMessage("Cannot rename a remote branch.");
    return;
  }
  const newName = await vscode.window.showInputBox({
    title: `Rename ${branch.name}`,
    value: branch.name,
    prompt: "New branch name",
    validateInput: (v) => {
      if (!v.trim()) return "Name required";
      if (/\s/.test(v)) return "No spaces";
      if (v === branch.name) return "Same as current name";
      return null;
    },
  });
  if (!newName) return;
  await runGit(repo, ["branch", "-m", branch.name, newName.trim()]);
  vscode.window.showInformationMessage(`Renamed ${branch.name} → ${newName}`);
}

async function listRemotes(repo: Repo): Promise<string[]> {
  const { stdout } = await runGit(repo, ["remote"]);
  return stdout.split("\n").map((s) => s.trim()).filter(Boolean);
}

async function pickRemote(repo: Repo, title: string): Promise<string | undefined> {
  const remotes = await listRemotes(repo);
  if (remotes.length === 0) {
    vscode.window.showWarningMessage("No remotes configured.");
    return undefined;
  }
  if (remotes.length === 1) return remotes[0];
  return vscode.window.showQuickPick(remotes, { title });
}

async function push({ repo, branch }: ActionContext): Promise<void> {
  if (branch.type === "remote") {
    vscode.window.showWarningMessage("Cannot push a remote-tracking branch directly.");
    return;
  }
  if (branch.upstream) {
    await runGit(repo, ["push", branch.upstream.remote, `${branch.name}:${branch.upstream.name}`]);
    vscode.window.showInformationMessage(`Pushed ${branch.name} → ${branch.upstream.remote}/${branch.upstream.name}`);
    return;
  }
  const remote = await pickRemote(repo, `Push ${branch.name} — choose remote`);
  if (!remote) return;
  await runGit(repo, ["push", "-u", remote, branch.name]);
  vscode.window.showInformationMessage(`Pushed ${branch.name} → ${remote}/${branch.name} (upstream set)`);
}

async function pull({ repo, branch, currentBranch }: ActionContext): Promise<void> {
  if (branch.name === currentBranch) {
    await repo.pull();
    vscode.window.showInformationMessage(`Pulled ${branch.name}`);
    return;
  }
  if (!branch.upstream) {
    vscode.window.showWarningMessage(`${branch.name} has no upstream.`);
    return;
  }
  await runGit(repo, ["fetch", branch.upstream.remote, `${branch.upstream.name}:${branch.name}`]);
  vscode.window.showInformationMessage(`Pulled ${branch.name} (fast-forward)`);
}

async function openReadOnlyDoc(title: string, content: string, language = "git-commit"): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc, { preview: true });
  void vscode.window.showInformationMessage(title);
}

async function showLog({ repo, branch }: ActionContext): Promise<void> {
  const { stdout } = await runGit(repo, [
    "log", "--graph", "--decorate", "--date=short",
    "--pretty=format:%h %ad %an  %s%d", "-n", "200", branch.name,
  ]);
  await openReadOnlyDoc(`Log: ${branch.name}`, stdout || "(no commits)");
}

async function compareWithCurrent({ repo, branch, currentBranch }: ActionContext): Promise<void> {
  if (!currentBranch) {
    vscode.window.showWarningMessage("No current branch.");
    return;
  }
  if (branch.name === currentBranch) {
    vscode.window.showInformationMessage("Same branch.");
    return;
  }
  const [ahead, behind] = await Promise.all([
    runGit(repo, ["log", "--pretty=format:%h %ad %an  %s", "--date=short", `${currentBranch}..${branch.name}`]),
    runGit(repo, ["log", "--pretty=format:%h %ad %an  %s", "--date=short", `${branch.name}..${currentBranch}`]),
  ]);
  const content = [
    `# ${branch.name} vs ${currentBranch}`,
    "",
    `## Commits in ${branch.name} not in ${currentBranch} (${ahead.stdout.split("\n").filter(Boolean).length})`,
    ahead.stdout || "(none)",
    "",
    `## Commits in ${currentBranch} not in ${branch.name} (${behind.stdout.split("\n").filter(Boolean).length})`,
    behind.stdout || "(none)",
  ].join("\n");
  await openReadOnlyDoc(`Compare: ${branch.name} ↔ ${currentBranch}`, content, "markdown");
}

export async function newBranchFromHead(repo: Repo): Promise<void> {
  const head = repo.state.HEAD;
  const fromLabel = head?.name ?? "HEAD";
  const name = await vscode.window.showInputBox({
    title: `New branch from ${fromLabel}`,
    prompt: "Branch name",
    validateInput: (v) => (!v.trim() ? "Name required" : /\s/.test(v) ? "No spaces" : null),
  });
  if (!name) return;
  try {
    await repo.createBranch(name.trim(), true);
    vscode.window.showInformationMessage(`Created and checked out ${name}`);
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    vscode.window.showErrorMessage(`Create branch failed: ${err.stderr?.trim() ?? err.message ?? String(e)}`);
  }
}

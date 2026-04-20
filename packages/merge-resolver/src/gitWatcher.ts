import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { MergeEditorProvider } from "./mergeEditorProvider";

const pexec = promisify(exec);

interface GitChange { uri: vscode.Uri; }
interface GitRepoState {
  mergeChanges: GitChange[];
  rebaseCommit: unknown;
  onDidChange: vscode.Event<void>;
}
interface GitRepo {
  rootUri: vscode.Uri;
  state: GitRepoState;
  add(paths: string[]): Promise<void>;
  commit(msg: string, opts?: { all?: boolean }): Promise<void>;
}
interface GitAPI {
  repositories: GitRepo[];
  onDidOpenRepository: vscode.Event<GitRepo>;
}

const announced = new WeakSet<GitRepo>();

export async function initGitWatcher(context: vscode.ExtensionContext): Promise<void> {
  const gitExt = vscode.extensions.getExtension<{ getAPI(v: number): GitAPI }>("vscode.git");
  if (!gitExt) return;

  const api = (await gitExt.activate()).getAPI(1);

  const attach = (repo: GitRepo) => {
    context.subscriptions.push(repo.state.onDidChange(() => check(repo)));
    check(repo);
  };

  for (const repo of api.repositories) attach(repo);
  context.subscriptions.push(api.onDidOpenRepository(attach));
}

async function check(repo: GitRepo) {
  const conflicts = repo.state.mergeChanges;
  if (conflicts.length === 0) {
    announced.delete(repo);
    return;
  }
  if (announced.has(repo)) return;
  announced.add(repo);

  const choice = await vscode.window.showInformationMessage(
    `Merge conflict in ${conflicts.length} file${conflicts.length === 1 ? "" : "s"}. Resolve with Merge Resolver?`,
    "Resolve Now",
    "Later",
  );
  if (choice !== "Resolve Now") return;

  for (let i = 0; i < conflicts.length; i++) {
    await vscode.commands.executeCommand("vscode.openWith", conflicts[i].uri, MergeEditorProvider.viewType);
    if (i === 0) {
      try {
        await vscode.commands.executeCommand("workbench.action.moveEditorToNewWindow");
      } catch { /* command unavailable — stay in main window */ }
    }
  }
}

export async function stageResolved(uri: vscode.Uri): Promise<void> {
  const gitExt = vscode.extensions.getExtension<{ getAPI(v: number): GitAPI }>("vscode.git");
  if (!gitExt) return;
  const api = (await gitExt.activate()).getAPI(1);
  const repo = api.repositories.find((r) => uri.fsPath.startsWith(r.rootUri.fsPath));
  if (!repo) return;
  await repo.add([uri.fsPath]);
  if (repo.state.mergeChanges.length > 0) return;

  const state = detectGitState(repo.rootUri.fsPath);
  try {
    if (state === "rebasing") {
      await runGit(repo.rootUri.fsPath, ["rebase", "--continue"]);
      vscode.window.showInformationMessage("Rebase continued.");
    } else if (state === "merging") {
      await runGit(repo.rootUri.fsPath, ["commit", "--no-edit"]);
      vscode.window.showInformationMessage("Merge committed.");
    }
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    vscode.window.showErrorMessage(`Continue failed: ${err.stderr?.trim() ?? err.message ?? String(e)}`);
  }
}

export async function abortMerge(uri: vscode.Uri): Promise<boolean> {
  const gitExt = vscode.extensions.getExtension<{ getAPI(v: number): GitAPI }>("vscode.git");
  if (!gitExt) return false;
  const api = (await gitExt.activate()).getAPI(1);
  const repo = api.repositories.find((r) => uri.fsPath.startsWith(r.rootUri.fsPath));
  if (!repo) return false;

  const state = detectGitState(repo.rootUri.fsPath);
  if (state === "none") {
    vscode.window.showWarningMessage("No merge or rebase in progress.");
    return false;
  }

  const label = state === "rebasing" ? "rebase" : "merge";
  const choice = await vscode.window.showWarningMessage(
    `Abort ${label}? All conflict resolutions will be discarded and the working tree will be reset.`,
    { modal: true },
    `Abort ${label[0].toUpperCase() + label.slice(1)}`,
  );
  if (!choice) return false;

  try {
    await runGit(repo.rootUri.fsPath, [state === "rebasing" ? "rebase" : "merge", "--abort"]);
    vscode.window.showInformationMessage(`${label[0].toUpperCase() + label.slice(1)} aborted.`);
    return true;
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    vscode.window.showErrorMessage(`Abort failed: ${err.stderr?.trim() ?? err.message ?? String(e)}`);
    return false;
  }
}

export interface Commit {
  hash: string;
  author: string;
  when: string;
  subject: string;
}

export async function getConflictHistory(uri: vscode.Uri): Promise<{ yours: Commit[]; theirs: Commit[] }> {
  const empty = { yours: [], theirs: [] };
  const gitExt = vscode.extensions.getExtension<{ getAPI(v: number): GitAPI }>("vscode.git");
  if (!gitExt) return empty;
  const api = (await gitExt.activate()).getAPI(1);
  const repo = api.repositories.find((r) => uri.fsPath.startsWith(r.rootUri.fsPath));
  if (!repo) return empty;

  const repoRoot = repo.rootUri.fsPath;
  const state = detectGitState(repoRoot);
  if (state === "none") return empty;

  const relPath = path.relative(repoRoot, uri.fsPath);
  const theirsRef = state === "merging" ? "MERGE_HEAD" : resolveTheirsRebaseRef(repoRoot);

  const [yours, theirs] = await Promise.all([
    gitLog(repoRoot, "HEAD", relPath),
    theirsRef ? gitLog(repoRoot, theirsRef, relPath) : Promise.resolve([]),
  ]);
  return { yours, theirs };
}

function resolveTheirsRebaseRef(repoRoot: string): string | undefined {
  const gitDir = path.join(repoRoot, ".git");
  const stopped = path.join(gitDir, "rebase-merge", "stopped-sha");
  if (fs.existsSync(stopped)) {
    try { return fs.readFileSync(stopped, "utf8").trim(); } catch { /* ignore */ }
  }
  const applyNext = path.join(gitDir, "rebase-apply", "original-commit");
  if (fs.existsSync(applyNext)) {
    try { return fs.readFileSync(applyNext, "utf8").trim(); } catch { /* ignore */ }
  }
  return "REBASE_HEAD";
}

async function gitLog(cwd: string, ref: string, file: string): Promise<Commit[]> {
  try {
    const sep = "\x1f";
    const { stdout } = await runGit(cwd, ["log", "-n", "5", `--format=%h${sep}%an${sep}%ar${sep}%s`, ref, "--", file]);
    return stdout.trim().split("\n").filter(Boolean).map((line) => {
      const [hash, author, when, ...rest] = line.split(sep);
      return { hash, author, when, subject: rest.join(sep) };
    });
  } catch {
    return [];
  }
}

export function gitStateFor(uri: vscode.Uri): "merging" | "rebasing" | "none" {
  const match = uri.fsPath.match(/^(.*?)(?:\/[^/]+)*$/);
  if (!match) return "none";
  let dir = uri.fsPath;
  while (dir && dir !== "/") {
    if (fs.existsSync(path.join(dir, ".git"))) return detectGitState(dir);
    dir = path.dirname(dir);
  }
  return "none";
}

function detectGitState(repoRoot: string): "merging" | "rebasing" | "none" {
  const gitDir = path.join(repoRoot, ".git");
  if (fs.existsSync(path.join(gitDir, "rebase-merge")) || fs.existsSync(path.join(gitDir, "rebase-apply"))) {
    return "rebasing";
  }
  if (fs.existsSync(path.join(gitDir, "MERGE_HEAD"))) {
    return "merging";
  }
  return "none";
}

async function runGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const cmd = `git ${args.map((a) => (/^[A-Za-z0-9_./:\-]+$/.test(a) ? a : `'${a.replace(/'/g, "'\\''")}'`)).join(" ")}`;
  return pexec(cmd, { cwd });
}

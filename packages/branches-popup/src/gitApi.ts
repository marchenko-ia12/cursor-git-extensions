import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

const pexec = promisify(exec);

export interface Branch {
  name: string;
  type: "commit" | "head" | "remote";
  upstream?: { name: string; remote: string };
  commit?: string;
  ahead?: number;
  behind?: number;
}

export interface RepoState {
  HEAD: { name?: string; commit?: string; type?: string; ahead?: number; behind?: number; upstream?: { name: string; remote: string } } | undefined;
  onDidChange: vscode.Event<void>;
}

export interface Repo {
  rootUri: vscode.Uri;
  state: RepoState;
  checkout(ref: string): Promise<void>;
  createBranch(name: string, checkout: boolean, ref?: string): Promise<void>;
  deleteBranch(name: string, force?: boolean): Promise<void>;
  getBranches(query: { remote?: boolean }): Promise<Branch[]>;
  merge(ref: string): Promise<void>;
  fetch(opts?: { remote?: string; ref?: string }): Promise<void>;
  pull(): Promise<void>;
}

export interface GitAPI {
  repositories: Repo[];
  onDidOpenRepository: vscode.Event<Repo>;
  openRepository?(root: vscode.Uri): Promise<Repo | null>;
}

export async function getGitApi(): Promise<GitAPI | undefined> {
  const ext = vscode.extensions.getExtension<{ getAPI(v: number): GitAPI }>("vscode.git");
  if (!ext) return undefined;
  const exports = await ext.activate();
  return exports.getAPI(1);
}

export async function pickRepo(api: GitAPI): Promise<Repo | undefined> {
  if (api.repositories.length === 0) {
    vscode.window.showWarningMessage("No git repositories found in workspace.");
    return undefined;
  }
  if (api.repositories.length === 1) return api.repositories[0];

  const active = vscode.window.activeTextEditor?.document.uri;
  if (active) {
    const match = api.repositories.find((r) => active.fsPath.startsWith(r.rootUri.fsPath));
    if (match) return match;
  }

  const pick = await vscode.window.showQuickPick(
    api.repositories.map((r) => ({
      label: r.rootUri.fsPath.split("/").pop() ?? r.rootUri.fsPath,
      description: r.rootUri.fsPath,
      repo: r,
    })),
    { title: "Select repository" },
  );
  return pick?.repo;
}

export async function scanWorkspaceRepos(api: GitAPI, maxDepth = 3): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders.length || !api.openRepository) return;
  const known = new Set(api.repositories.map((r) => r.rootUri.fsPath));
  const candidates: vscode.Uri[] = [];

  const walk = async (uri: vscode.Uri, depth: number) => {
    if (depth > maxDepth) return;
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(uri);
    } catch {
      return;
    }
    const hasGit = entries.some(([n, t]) => n === ".git" && (t === vscode.FileType.Directory || t === vscode.FileType.File));
    if (hasGit) {
      if (!known.has(uri.fsPath)) candidates.push(uri);
      return;
    }
    for (const [name, type] of entries) {
      if (type !== vscode.FileType.Directory) continue;
      if (name.startsWith(".") || name === "node_modules") continue;
      await walk(vscode.Uri.joinPath(uri, name), depth + 1);
    }
  };

  for (const f of folders) await walk(f.uri, 0);
  await Promise.all(
    candidates.map((u) => api.openRepository!(u).catch(() => null)),
  );
}

export function pickActiveRepo(api: GitAPI): Repo | undefined {
  if (api.repositories.length === 0) return undefined;
  if (api.repositories.length === 1) return api.repositories[0];
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active) {
    const match = api.repositories.find((r) => active.fsPath.startsWith(r.rootUri.fsPath));
    if (match) return match;
  }
  return api.repositories[0];
}

export async function runGit(repo: Repo, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const cmd = `git ${args.map(shellEscape).join(" ")}`;
  try {
    return await pexec(cmd, { cwd: repo.rootUri.fsPath });
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    if (err.stderr && /conflict/i.test(err.stderr)) {
      return { stdout: err.stdout ?? "", stderr: err.stderr };
    }
    throw e;
  }
}

function shellEscape(s: string): string {
  if (/^[A-Za-z0-9_./:\-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}

import * as vscode from "vscode";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export interface RunConfig {
  id: string;
  label: string;
  script: string;
  cwd: string;
  packageName: string;
  folderName: string;
  packageManager: PackageManager;
}

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

export async function findAllConfigs(): Promise<RunConfig[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) return [];

  const configs: RunConfig[] = [];
  for (const folder of folders) {
    const pkgs = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, "**/package.json"),
      "**/node_modules/**"
    );
    for (const uri of pkgs) {
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const pkg: PackageJson = JSON.parse(Buffer.from(bytes).toString("utf8"));
        if (!pkg.scripts) continue;
        const cwd = vscode.Uri.joinPath(uri, "..").fsPath;
        const packageName = pkg.name ?? folderRelative(folder, cwd);
        const packageManager = await detectPackageManager(cwd, folder.uri.fsPath);
        for (const name of Object.keys(pkg.scripts)) {
          configs.push({
            id: `${cwd}::${name}`,
            label: name,
            script: name,
            cwd,
            packageName,
            folderName: folder.name,
            packageManager,
          });
        }
      } catch {
        // ignore unparseable package.json
      }
    }
  }
  return configs;
}

const LOCKFILES: Array<{ name: string; pm: PackageManager }> = [
  { name: "bun.lockb", pm: "bun" },
  { name: "bun.lock", pm: "bun" },
  { name: "pnpm-lock.yaml", pm: "pnpm" },
  { name: "yarn.lock", pm: "yarn" },
  { name: "package-lock.json", pm: "npm" },
];

async function detectPackageManager(startDir: string, stopDir: string): Promise<PackageManager> {
  let dir = startDir;
  for (;;) {
    for (const { name, pm } of LOCKFILES) {
      const uri = vscode.Uri.file(`${dir}/${name}`);
      try {
        await vscode.workspace.fs.stat(uri);
        return pm;
      } catch {
        // not here, keep looking
      }
    }
    if (dir === stopDir || dir === "/" || dir.length <= 1) break;
    const parent = parentDir(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "npm";
}

function parentDir(p: string): string {
  const i = p.lastIndexOf("/");
  if (i <= 0) return "/";
  return p.slice(0, i);
}

function folderRelative(folder: vscode.WorkspaceFolder, cwd: string): string {
  const rel = cwd.slice(folder.uri.fsPath.length).replace(/^[/\\]+/, "");
  return rel || folder.name;
}

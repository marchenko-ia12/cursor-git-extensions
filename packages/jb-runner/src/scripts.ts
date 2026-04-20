import * as path from "path";
import * as vscode from "vscode";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
export type ConfigKind = "npm" | "custom";

export interface RunConfig {
  id: string;
  kind: ConfigKind;
  label: string;
  command: string;
  cwd: string;
  packageName: string;
  folderName: string;
  packageManager?: PackageManager;
  env?: Record<string, string>;
}

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

interface CustomConfigRaw {
  name?: unknown;
  command?: unknown;
  cwd?: unknown;
  env?: unknown;
}

export async function findAllConfigs(): Promise<RunConfig[]> {
  const [npm, custom] = await Promise.all([findNpmConfigs(), readCustomConfigs()]);
  return [...custom, ...npm];
}

export async function findNpmConfigs(): Promise<RunConfig[]> {
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
            id: `npm::${cwd}::${name}`,
            kind: "npm",
            label: name,
            command: name,
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

export function readCustomConfigs(): RunConfig[] {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const root = folders[0]?.uri.fsPath;
  if (!root) return [];

  const raw = vscode.workspace
    .getConfiguration("jbRunner")
    .get<CustomConfigRaw[]>("configurations", []);

  const configs: RunConfig[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const command = typeof entry.command === "string" ? entry.command.trim() : "";
    if (!name || !command) continue;

    const cwdRaw = typeof entry.cwd === "string" ? entry.cwd.trim() : "";
    const cwd = cwdRaw ? resolveCwd(root, cwdRaw) : root;
    const env = sanitizeEnv(entry.env);

    configs.push({
      id: `custom::${name}`,
      kind: "custom",
      label: name,
      command,
      cwd,
      packageName: "Custom",
      folderName: folders[0].name,
      env,
    });
  }
  return configs;
}

function sanitizeEnv(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function resolveCwd(root: string, cwd: string): string {
  if (path.isAbsolute(cwd)) return cwd;
  return path.join(root, cwd);
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
      const uri = vscode.Uri.file(path.join(dir, name));
      try {
        await vscode.workspace.fs.stat(uri);
        return pm;
      } catch {
        // not here, keep looking
      }
    }
    if (dir === stopDir) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "npm";
}

function folderRelative(folder: vscode.WorkspaceFolder, cwd: string): string {
  const rel = cwd.slice(folder.uri.fsPath.length).replace(/^[/\\]+/, "");
  return rel || folder.name;
}

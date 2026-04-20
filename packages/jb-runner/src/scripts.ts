import * as vscode from "vscode";

export interface RunConfig {
  id: string;
  label: string;
  script: string;
  cwd: string;
  packageName: string;
  folderName: string;
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
        for (const name of Object.keys(pkg.scripts)) {
          configs.push({
            id: `${cwd}::${name}`,
            label: name,
            script: name,
            cwd,
            packageName,
            folderName: folder.name,
          });
        }
      } catch {
        // ignore unparseable package.json
      }
    }
  }
  return configs;
}

function folderRelative(folder: vscode.WorkspaceFolder, cwd: string): string {
  const rel = cwd.slice(folder.uri.fsPath.length).replace(/^[/\\]+/, "");
  return rel || folder.name;
}

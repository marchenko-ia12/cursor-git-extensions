import * as path from "path";
import * as vscode from "vscode";
import { Runner } from "./runner";

export class PackageJsonCodeLensProvider implements vscode.CodeLensProvider {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changeEmitter.event;

  constructor(private readonly runner: Runner) {
    runner.onChanged(() => this.changeEmitter.fire());
  }

  refresh(): void {
    this.changeEmitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (path.basename(document.fileName) !== "package.json") return [];
    const enabled = vscode.workspace
      .getConfiguration("jbRunner")
      .get<boolean>("packageJsonCodeLens", true);
    if (!enabled) return [];

    const scripts = findScriptKeys(document);
    if (scripts.length === 0) return [];

    const cwd = path.dirname(document.fileName);
    const running = this.runner.currentRunning;
    const runningHere =
      running && running.kind === "npm" && running.cwd === cwd ? running.label : undefined;

    const lenses: vscode.CodeLens[] = [];
    for (const { name, range } of scripts) {
      if (runningHere === name) {
        lenses.push(
          new vscode.CodeLens(range, {
            title: "$(debug-stop) Stop",
            command: "jbRunner.stop",
            tooltip: `JB Runner: stop ${name}`,
          })
        );
        lenses.push(
          new vscode.CodeLens(range, {
            title: "$(refresh) Restart",
            command: "jbRunner.restart",
            tooltip: `JB Runner: restart ${name}`,
          })
        );
      } else {
        lenses.push(
          new vscode.CodeLens(range, {
            title: "$(play) Run",
            command: "jbRunner.runScript",
            arguments: [{ cwd, script: name }],
            tooltip: `JB Runner: run ${name}`,
          })
        );
      }
    }
    return lenses;
  }
}

interface ScriptKey {
  name: string;
  range: vscode.Range;
}

function findScriptKeys(doc: vscode.TextDocument): ScriptKey[] {
  const text = doc.getText();
  const header = /"scripts"\s*:\s*\{/.exec(text);
  if (!header) return [];
  const bodyStart = header.index + header[0].length;

  let depth = 1;
  let i = bodyStart;
  let inString = false;
  let escape = false;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (escape) {
      escape = false;
      i++;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      i++;
      continue;
    }
    if (!inString) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    i++;
  }
  if (depth !== 0) return [];
  const bodyEnd = i - 1;

  const out: ScriptKey[] = [];
  const keyRe = /"((?:\\.|[^"\\])+)"\s*:/g;
  keyRe.lastIndex = bodyStart;
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(text)) !== null) {
    if (m.index >= bodyEnd) break;
    const pos = doc.positionAt(m.index);
    out.push({ name: m[1], range: new vscode.Range(pos, pos) });
  }
  return out;
}

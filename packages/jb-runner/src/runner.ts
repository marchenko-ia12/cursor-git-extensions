import * as vscode from "vscode";
import { RunConfig } from "./scripts";

interface RunningProcess {
  config: RunConfig;
  terminal: vscode.Terminal;
}

export class Runner {
  private running: RunningProcess | undefined;
  private readonly onChangedEmitter = new vscode.EventEmitter<void>();
  readonly onChanged = this.onChangedEmitter.event;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.window.onDidCloseTerminal(t => {
        if (this.running && t === this.running.terminal) {
          this.running = undefined;
          this.onChangedEmitter.fire();
        }
      })
    );
  }

  get currentRunning(): RunConfig | undefined {
    return this.running?.config;
  }

  isRunning(): boolean {
    return !!this.running;
  }

  async start(config: RunConfig): Promise<void> {
    if (this.running) {
      await this.stop();
    }
    const terminal = vscode.window.createTerminal({
      name: `▶ ${config.packageName}: ${config.script}`,
      cwd: config.cwd,
    });
    terminal.show(true);
    terminal.sendText(`npm run ${shellEscape(config.script)}`);
    this.running = { config, terminal };
    this.onChangedEmitter.fire();
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    const { terminal } = this.running;
    terminal.sendText("\u0003", false);
    const disposed = await waitForClose(terminal, 1500);
    if (!disposed) {
      terminal.dispose();
    }
    this.running = undefined;
    this.onChangedEmitter.fire();
  }

  showOutput(): void {
    this.running?.terminal.show(false);
  }
}

function shellEscape(s: string): string {
  if (/^[\w@./:-]+$/.test(s)) return s;
  return `"${s.replace(/(["\\$`])/g, "\\$1")}"`;
}

function waitForClose(terminal: vscode.Terminal, timeoutMs: number): Promise<boolean> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      disposable.dispose();
      resolve(false);
    }, timeoutMs);
    const disposable = vscode.window.onDidCloseTerminal(t => {
      if (t === terminal) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(true);
      }
    });
  });
}

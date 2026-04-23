import * as vscode from "vscode";
import { RunConfig } from "./scripts";

interface RunningProcess {
  config: RunConfig;
  terminal: vscode.Terminal;
  endListener?: vscode.Disposable;
}

export class Runner {
  private running: RunningProcess | undefined;
  private readonly onChangedEmitter = new vscode.EventEmitter<void>();
  readonly onChanged = this.onChangedEmitter.event;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.window.onDidCloseTerminal(t => {
        if (this.running && t === this.running.terminal) {
          this.markStopped();
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
      name: `▶ ${config.packageName}: ${config.label}`,
      cwd: config.cwd,
      env: config.env,
    });
    terminal.show(true);

    const cmdLine = commandLine(config);
    const process: RunningProcess = { config, terminal };
    this.running = process;
    this.onChangedEmitter.fire();

    // Prefer shell integration — it reports actual command-exit, not terminal-close.
    // Falls back to plain sendText() on hosts / shells without integration.
    const integration = await waitForShellIntegration(terminal, 3000);
    if (this.running !== process) {
      // user stopped / restarted while we were waiting — bail
      return;
    }
    if (integration && typeof integration.executeCommand === "function") {
      const execution = integration.executeCommand(cmdLine);
      const endEvent = (vscode.window as unknown as {
        onDidEndTerminalShellExecution?: vscode.Event<{
          execution: unknown;
          exitCode: number | undefined;
        }>;
      }).onDidEndTerminalShellExecution;
      if (endEvent) {
        process.endListener = endEvent(ev => {
          if (ev.execution === execution && this.running === process) {
            this.markStopped();
          }
        });
      }
    } else {
      terminal.sendText(cmdLine);
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    const { terminal } = this.running;
    terminal.sendText("\u0003", false);
    const disposed = await waitForClose(terminal, 1500);
    if (!disposed) {
      terminal.dispose();
    }
    this.markStopped();
  }

  private markStopped(): void {
    if (!this.running) return;
    this.running.endListener?.dispose();
    this.running = undefined;
    this.onChangedEmitter.fire();
  }

  showOutput(): void {
    this.running?.terminal.show(false);
  }
}

function commandLine(config: RunConfig): string {
  if (config.kind === "custom") return config.command;
  const pm = config.packageManager ?? "npm";
  return `${pm} run ${shellEscape(config.command)}`;
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

interface ShellIntegrationApi {
  executeCommand(commandLine: string): unknown;
}

function waitForShellIntegration(
  terminal: vscode.Terminal,
  timeoutMs: number
): Promise<ShellIntegrationApi | undefined> {
  const existing = (terminal as unknown as { shellIntegration?: ShellIntegrationApi })
    .shellIntegration;
  if (existing) return Promise.resolve(existing);

  const changeEvent = (vscode.window as unknown as {
    onDidChangeTerminalShellIntegration?: vscode.Event<{
      terminal: vscode.Terminal;
      shellIntegration: ShellIntegrationApi;
    }>;
  }).onDidChangeTerminalShellIntegration;
  if (!changeEvent) return Promise.resolve(undefined);

  return new Promise(resolve => {
    const timer = setTimeout(() => {
      disposable.dispose();
      resolve(undefined);
    }, timeoutMs);
    const disposable = changeEvent(ev => {
      if (ev.terminal === terminal) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(ev.shellIntegration);
      }
    });
  });
}

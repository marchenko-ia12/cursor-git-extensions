import * as vscode from "vscode";
import { Runner } from "./runner";
import { RunConfig } from "./scripts";

const CONFIG_PRIORITY = 101;
const RUN_PRIORITY = 100;
const STOP_PRIORITY = 99;
const RESTART_PRIORITY = 98.5;
const OUTPUT_PRIORITY = 98;

export class StatusBar {
  private readonly configItem: vscode.StatusBarItem;
  private readonly runItem: vscode.StatusBarItem;
  private readonly stopItem: vscode.StatusBarItem;
  private readonly restartItem: vscode.StatusBarItem;
  private readonly outputItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext, private readonly runner: Runner) {
    this.configItem = vscode.window.createStatusBarItem(
      "jbRunner.config",
      vscode.StatusBarAlignment.Left,
      CONFIG_PRIORITY
    );
    this.configItem.command = "jbRunner.pickConfig";
    this.configItem.name = "JB Runner: Configuration";

    this.runItem = vscode.window.createStatusBarItem(
      "jbRunner.run",
      vscode.StatusBarAlignment.Left,
      RUN_PRIORITY
    );
    this.runItem.command = "jbRunner.run";
    this.runItem.name = "JB Runner: Run";
    this.runItem.text = "$(play)";
    this.runItem.color = new vscode.ThemeColor("charts.green");

    this.stopItem = vscode.window.createStatusBarItem(
      "jbRunner.stop",
      vscode.StatusBarAlignment.Left,
      STOP_PRIORITY
    );
    this.stopItem.command = "jbRunner.stop";
    this.stopItem.name = "JB Runner: Stop";
    this.stopItem.text = "$(debug-stop)";
    this.stopItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");

    this.restartItem = vscode.window.createStatusBarItem(
      "jbRunner.restart",
      vscode.StatusBarAlignment.Left,
      RESTART_PRIORITY
    );
    this.restartItem.command = "jbRunner.restart";
    this.restartItem.name = "JB Runner: Restart";
    this.restartItem.text = "$(refresh)";
    this.restartItem.color = new vscode.ThemeColor("charts.yellow");

    this.outputItem = vscode.window.createStatusBarItem(
      "jbRunner.output",
      vscode.StatusBarAlignment.Left,
      OUTPUT_PRIORITY
    );
    this.outputItem.command = "jbRunner.showOutput";
    this.outputItem.name = "JB Runner: Show Output";
    this.outputItem.text = "$(terminal)";
    this.outputItem.tooltip = "Show running output";

    context.subscriptions.push(
      this.configItem,
      this.runItem,
      this.stopItem,
      this.restartItem,
      this.outputItem,
      this.runner.onChanged(() => this.update())
    );
  }

  private selected: RunConfig | undefined;

  render(selected: RunConfig | undefined): void {
    this.selected = selected;
    this.update();
    this.configItem.show();
  }

  private update(): void {
    const running = this.runner.isRunning();
    const runningCfg = this.runner.currentRunning;
    const display = this.selected;

    if (running && runningCfg) {
      this.configItem.text = `$(sync~spin) ${runningCfg.packageName}: ${runningCfg.label}`;
      this.configItem.tooltip =
        `Running: ${runningCfg.packageName} — ${runningCfg.label}\n` +
        `${renderCommand(runningCfg)}\n` +
        `${runningCfg.cwd}\n\n` +
        `Click to pick another configuration`;
    } else if (display) {
      this.configItem.text = `$(project) ${display.packageName}: ${display.label}`;
      this.configItem.tooltip =
        `Pick run configuration\n` +
        `Current: ${display.packageName} — ${display.label}\n` +
        `${renderCommand(display)}\n` +
        `${display.cwd}`;
    } else {
      this.configItem.text = "$(project) No config";
      this.configItem.tooltip = "Pick run configuration";
    }

    if (running) {
      this.runItem.hide();
      this.stopItem.show();
      this.restartItem.show();
      this.outputItem.show();
      if (runningCfg) {
        this.stopItem.tooltip = `Stop: ${runningCfg.packageName} — ${runningCfg.label} (${keyHint("Cmd+F2", "Ctrl+F2")})`;
        this.restartItem.tooltip = `Restart: ${runningCfg.packageName} — ${runningCfg.label} (${keyHint("Cmd+F5", "Ctrl+F5")})`;
      }
    } else {
      this.stopItem.hide();
      this.restartItem.hide();
      this.outputItem.hide();
      this.runItem.show();
      this.runItem.tooltip = `Run (${keyHint("Cmd+Alt+R", "Ctrl+Alt+R")})`;
    }
  }
}

function keyHint(mac: string, other: string): string {
  return process.platform === "darwin" ? mac : other;
}

function renderCommand(cfg: RunConfig): string {
  if (cfg.kind === "custom") return cfg.command;
  return `${cfg.packageManager ?? "npm"} run ${cfg.command}`;
}

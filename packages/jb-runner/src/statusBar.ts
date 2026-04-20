import * as vscode from "vscode";
import { Runner } from "./runner";
import { RunConfig } from "./scripts";

const CONFIG_PRIORITY = 101;
const RUN_PRIORITY = 100;
const STOP_PRIORITY = 99;
const OUTPUT_PRIORITY = 98;

export class StatusBar {
  private readonly configItem: vscode.StatusBarItem;
  private readonly runItem: vscode.StatusBarItem;
  private readonly stopItem: vscode.StatusBarItem;
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
      this.outputItem,
      this.runner.onChanged(() => this.update())
    );
  }

  render(selected: RunConfig | undefined): void {
    if (selected) {
      this.configItem.text = `$(project) ${selected.packageName}: ${selected.script}`;
      this.configItem.tooltip = `Pick run configuration\nCurrent: ${selected.packageName} — ${selected.script}\n${selected.cwd}`;
    } else {
      this.configItem.text = "$(project) No config";
      this.configItem.tooltip = "Pick run configuration";
    }
    this.configItem.show();
    this.update();
  }

  private update(): void {
    const running = this.runner.isRunning();
    if (running) {
      this.runItem.hide();
      this.stopItem.show();
      this.outputItem.show();
      const cfg = this.runner.currentRunning;
      if (cfg) {
        this.stopItem.tooltip = `Stop: ${cfg.packageName} — ${cfg.script} (${keyHint("Cmd+F2", "Ctrl+F2")})`;
      }
    } else {
      this.stopItem.hide();
      this.outputItem.hide();
      this.runItem.show();
      this.runItem.tooltip = `Run (${keyHint("Cmd+Alt+R", "Ctrl+Alt+R")})`;
    }
  }
}

function keyHint(mac: string, other: string): string {
  return process.platform === "darwin" ? mac : other;
}

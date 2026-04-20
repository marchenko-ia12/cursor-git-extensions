import * as vscode from "vscode";
import * as path from "path";
import { parse, render, Resolution, Chunk } from "./conflictParser";
import { webviewHtml } from "./webview";
import { stageResolved, abortMerge, gitStateFor, getConflictHistory, Commit } from "./gitWatcher";
import { getApiKey, hasApiKey, promptForApiKey, streamAnthropic } from "./aiClient";

function buildAiPrompt(
  fileName: string,
  conflict: Extract<Chunk, { kind: "conflict" }>,
  chunks: Chunk[],
  history: { yours: Commit[]; theirs: Commit[] },
): string {
  const ext = path.extname(fileName).slice(1) || "text";
  const base = path.basename(fileName);
  const before = contextAround(chunks, conflict.id, "before", 15);
  const after = contextAround(chunks, conflict.id, "after", 15);
  const blurb = formatHistoryBlurb(history);

  const baseSection = conflict.base !== null
    ? `\nCommon ancestor (BASE):\n\`\`\`${ext}\n${conflict.base}\n\`\`\`\n`
    : "";

  return `You are resolving a git merge conflict in ${base}.
${blurb}
Context before the conflict:
\`\`\`${ext}
${before}
\`\`\`

YOURS side (${conflict.yoursLabel}):
\`\`\`${ext}
${conflict.yours}
\`\`\`
${baseSection}
THEIRS side (${conflict.theirsLabel}):
\`\`\`${ext}
${conflict.theirs}
\`\`\`

Context after the conflict:
\`\`\`${ext}
${after}
\`\`\`

Task: Produce a merged version that preserves the intent of BOTH sides. If one side is clearly a subset or refactor of the other, pick the correct one. Output ONLY the merged code that should replace the conflict region. No explanation. No markdown fences. No surrounding context lines.`;
}

function contextAround(chunks: Chunk[], conflictId: number, side: "before" | "after", maxLines: number): string {
  const idx = chunks.findIndex((c) => c.kind === "conflict" && c.id === conflictId);
  if (idx < 0) return "";
  const neighbor = side === "before" ? chunks[idx - 1] : chunks[idx + 1];
  if (!neighbor || neighbor.kind !== "common") return "";
  const lines = neighbor.text.split("\n");
  return side === "before" ? lines.slice(-maxLines).join("\n") : lines.slice(0, maxLines).join("\n");
}

function formatHistoryBlurb(h: { yours: Commit[]; theirs: Commit[] }): string {
  if (h.yours.length === 0 && h.theirs.length === 0) return "";
  const fmt = (cs: Commit[]) => cs.slice(0, 3).map((c) => `  - ${c.hash} by ${c.author}: ${c.subject}`).join("\n") || "  (none)";
  return `\nRecent commits touching this file:\n\nYours side:\n${fmt(h.yours)}\n\nTheirs side:\n${fmt(h.theirs)}\n`;
}

function stripCodeFence(text: string): string {
  return text.replace(/^\s*```[\w-]*\n?/, "").replace(/\n?```\s*$/, "").replace(/^\n+|\n+$/g, "");
}

export class MergeEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "mergeResolver.editor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    panel.webview.options = { enableScripts: true };
    panel.webview.html = webviewHtml(panel.webview, this.context.extensionUri);

    const resolutions = new Map<number, Resolution>();
    const history: Array<{ id: number; prev: Resolution | undefined }> = [];
    let commitHistory: { yours: Commit[]; theirs: Commit[] } = { yours: [], theirs: [] };
    let aiKeySet = await hasApiKey(this.context);

    const postState = () => {
      const chunks = parse(document.getText());
      panel.webview.postMessage({
        type: "state",
        chunks,
        resolutions: Array.from(resolutions.entries()),
        canUndo: history.length > 0,
        fileName: document.fileName,
        gitState: gitStateFor(document.uri),
        commitHistory,
        hasAiKey: aiKeySet,
      });
    };

    void getConflictHistory(document.uri).then((h) => {
      commitHistory = h;
      postState();
    });

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) postState();
    });
    panel.onDidDispose(() => changeSub.dispose());

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "ready") {
        postState();
        return;
      }
      if (msg.type === "resolve") {
        history.push({ id: msg.id, prev: resolutions.get(msg.id) });
        resolutions.set(msg.id, msg.resolution);
        postState();
        return;
      }
      if (msg.type === "reset") {
        if (resolutions.has(msg.id)) {
          history.push({ id: msg.id, prev: resolutions.get(msg.id) });
          resolutions.delete(msg.id);
          postState();
        }
        return;
      }
      if (msg.type === "abort") {
        const aborted = await abortMerge(document.uri);
        if (aborted) panel.dispose();
        return;
      }
      if (msg.type === "undo") {
        const entry = history.pop();
        if (!entry) return;
        if (entry.prev === undefined) resolutions.delete(entry.id);
        else resolutions.set(entry.id, entry.prev);
        postState();
        return;
      }
      if (msg.type === "setAiKey") {
        await promptForApiKey(this.context);
        aiKeySet = await hasApiKey(this.context);
        postState();
        return;
      }
      if (msg.type === "aiSuggest") {
        const key = await getApiKey(this.context);
        if (!key) {
          panel.webview.postMessage({ type: "aiError", id: msg.id, error: "No API key set. Click the key button in the header to add one." });
          return;
        }
        const chunks = parse(document.getText());
        const conflict = chunks.find((c) => c.kind === "conflict" && c.id === msg.id);
        if (!conflict || conflict.kind !== "conflict") return;
        panel.webview.postMessage({ type: "aiStart", id: msg.id });
        try {
          const prompt = buildAiPrompt(document.fileName, conflict, chunks, commitHistory);
          const cts = new vscode.CancellationTokenSource();
          panel.onDidDispose(() => cts.cancel());
          const full = await streamAnthropic(key, prompt, (chunk) => {
            panel.webview.postMessage({ type: "aiChunk", id: msg.id, text: chunk });
          }, cts.token);
          panel.webview.postMessage({ type: "aiDone", id: msg.id, text: stripCodeFence(full) });
        } catch (e) {
          const err = e as Error;
          panel.webview.postMessage({ type: "aiError", id: msg.id, error: err.message || String(e) });
        }
        return;
      }
      if (msg.type === "save") {
        const chunks = parse(document.getText());
        const unresolved = chunks.some(
          (c) => c.kind === "conflict" && !resolutions.has((c as Extract<Chunk, {kind:"conflict"}>).id),
        );
        if (unresolved) return;
        const next = render(chunks, resolutions);
        const edit = new vscode.WorkspaceEdit();
        const full = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        );
        edit.replace(document.uri, full, next);
        await vscode.workspace.applyEdit(edit);
        await document.save();
        await stageResolved(document.uri);
        panel.dispose();
      }
    });
  }
}

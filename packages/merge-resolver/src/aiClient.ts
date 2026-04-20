import * as vscode from "vscode";

const SECRET_KEY = "mergeResolver.anthropicKey";

export async function hasApiKey(context: vscode.ExtensionContext): Promise<boolean> {
  return !!(await context.secrets.get(SECRET_KEY));
}

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(SECRET_KEY);
}

export async function promptForApiKey(context: vscode.ExtensionContext): Promise<boolean> {
  const existing = await context.secrets.get(SECRET_KEY);
  const value = await vscode.window.showInputBox({
    title: existing ? "Update Anthropic API key" : "Set Anthropic API key",
    prompt: "Paste your Anthropic API key. Leave empty to delete.",
    password: true,
    placeHolder: "sk-ant-api03-...",
    ignoreFocusOut: true,
  });
  if (value === undefined) return false;
  if (value.trim() === "") {
    await context.secrets.delete(SECRET_KEY);
    vscode.window.showInformationMessage("Anthropic API key deleted.");
  } else {
    await context.secrets.store(SECRET_KEY, value.trim());
    vscode.window.showInformationMessage("Anthropic API key saved.");
  }
  return true;
}

export async function streamAnthropic(
  apiKey: string,
  prompt: string,
  onChunk: (text: string) => void,
  token: vscode.CancellationToken,
): Promise<string> {
  const model = vscode.workspace.getConfiguration("mergeResolver").get<string>("anthropicModel") || "claude-sonnet-4-6";
  const controller = new AbortController();
  const cancelSub = token.onCancellationRequested(() => controller.abort());

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed?.error?.message || errText;
      } catch { /* ignore */ }
      throw new Error(`Anthropic API ${res.status}: ${msg.slice(0, 400)}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split("\n\n");
      buf = events.pop() || "";
      for (const event of events) {
        for (const line of event.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              const txt: string = parsed.delta.text;
              full += txt;
              onChunk(txt);
            }
          } catch { /* ignore malformed */ }
        }
      }
    }
    return full;
  } finally {
    cancelSub.dispose();
  }
}

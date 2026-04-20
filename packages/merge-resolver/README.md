# Ocelot Merge Resolver

*Six-shooter for your git conflicts.*

A JetBrains-style 3-way merge conflict resolver for VS Code and Cursor. Resolves `.git/MERGE_HEAD` / rebase conflicts in a dedicated full-screen editor with mini-map navigation, per-side git history, and optional AI-assisted suggestions powered by the Anthropic API.

## Features

- **3-pane layout** — Yours, Base (common ancestor), Theirs side-by-side with clear accept buttons at each conflict.
- **Auto-open in a separate window** — when a merge / rebase stops, the resolver automatically opens the first conflict in a new OS window so the main Cursor window stays free.
- **Mini-map** — a proportional overview of all conflicts in the file with color-coded status (unresolved / accepted-yours / accepted-theirs / accepted-base / custom).
- **Prev / Next navigation** — `F7` / `Shift+F7` or the toolbar buttons jump between conflicts.
- **Undo** — `Cmd+Z` / `Ctrl+Z` or the toolbar button restores previous resolutions from an in-memory history stack.
- **Abort Merge / Rebase** — discards in-progress resolutions and aborts the operation.
- **Git history per side** — collapsible sections show the last commits that touched the file on each side, with author and relative date.
- **AI-assisted suggestion** — the resolver can call Anthropic's API with the conflict, surrounding context, and history, then stream the proposed resolution into a preview panel you can accept or dismiss.

## AI setup (optional)

1. Run **Merge Resolver: Set Anthropic API key** from the command palette.
2. Paste an API key (starts with `sk-ant-...`). It is stored encrypted in VS Code's SecretStorage.
3. Click the sparkle button on any conflict to request a suggestion.

The model can be configured via the `mergeResolver.anthropicModel` setting (default: `claude-sonnet-4-6`).

## Usage

- When a merge or rebase stops with conflicts, the extension detects it and prompts to open the resolver. The first conflict opens in a new window automatically.
- You can also open any file in the resolver manually via **Merge Resolver: Open current file in Merge Resolver**.
- After resolving every conflict click **Save** — resolved files are staged automatically, and the merge/rebase can be continued.

## Requirements

- The built-in `vscode.git` extension must be enabled.
- Optional: an Anthropic API key for AI suggestions.

## License

MIT

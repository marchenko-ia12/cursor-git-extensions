# Ocelot Merge Resolver

*Six-shooter for your git conflicts.*

A JetBrains-style 3-way merge conflict resolver for VS Code and Cursor. Resolves `.git/MERGE_HEAD` / rebase conflicts in a dedicated full-screen editor with mini-map navigation, per-side git history, and optional AI-assisted suggestions powered by the Anthropic API.

## Features

- **3-pane layout** — Yours, Base (common ancestor), Theirs side-by-side with clear accept buttons at each conflict.
- **Focus mode** — when a merge / rebase stops, the resolver closes the bottom panel, the right auxiliary bar, and other editor groups, leaving only your primary sidebar and a full-width merge editor (Claude-Code-style). Switch to a new OS window or do nothing via `mergeResolver.openBehavior`.
- **Mini-map** — a proportional overview of all conflicts in the file with color-coded status (unresolved / accepted-yours / accepted-theirs / accepted-base / custom).
- **Prev / Next navigation** — `F7` / `Shift+F7` or the toolbar buttons jump between conflicts.
- **Undo** — `Cmd+Z` / `Ctrl+Z` or the toolbar button restores previous resolutions from an in-memory history stack.
- **Abort Merge / Rebase** — discards in-progress resolutions and aborts the operation.
- **Git history per side** — collapsible sections show the last commits that touched the file on each side, with author and relative date.
- **AI-assisted suggestion** — the resolver can call Anthropic's API with the conflict, surrounding context, and history, then stream the proposed resolution into a preview panel you can accept or dismiss.

## How it opens (`mergeResolver.openBehavior`)

When the extension detects an interrupted merge or rebase it opens
the first conflict for you. How the surrounding workbench is arranged
at that moment is controlled by the `mergeResolver.openBehavior`
setting:

| Value | What happens | When to use it |
| --- | --- | --- |
| `focusMode` *(default)* | Closes the bottom panel (terminal / output / problems), the right auxiliary bar, and every other editor group. Keeps the primary sidebar (source control, Claude chat, file tree) intact. You end up with `sidebar │ merge editor`, nothing else — Claude-Code-style. | You want maximum horizontal space for the diff without losing your usual sidebar. |
| `newWindow` | Moves the merge editor into a brand-new OS window. Your main window stays untouched. | You want to keep your current layout frozen and handle the conflict in a separate window. |
| `current` | Just opens the editor, does not rearrange anything. | You don't want the extension touching your layout. |

### Change it

- **Settings UI:** `Cmd+,` → search **Merge Resolver** → **Open Behavior** dropdown.
- **Command:** `Cmd+Shift+P` → **Merge Resolver: Change open behavior** (opens the setting directly).
- **`settings.json`:**
  ```json
  {
    "mergeResolver.openBehavior": "focusMode"
  }
  ```
  Put it under User settings for a global default, or `.vscode/settings.json`
  to share the choice with your team via git.

## AI setup (optional)

1. Run **Merge Resolver: Set Anthropic API key** from the command palette.
2. Paste an API key (starts with `sk-ant-...`). It is stored encrypted in VS Code's SecretStorage.
3. Click the sparkle button on any conflict to request a suggestion.

The model can be configured via the `mergeResolver.anthropicModel` setting (default: `claude-sonnet-4-6`).

## Settings — at a glance

| Key | Type | Default | Purpose |
| --- | --- | --- | --- |
| `mergeResolver.openBehavior` | `"focusMode" \| "newWindow" \| "current"` | `"focusMode"` | How the workbench is arranged when a conflict auto-opens (see section above). |
| `mergeResolver.anthropicModel` | string | `"claude-sonnet-4-6"` | Anthropic model used for AI conflict suggestions. |

## Commands

- `Merge Resolver: Open current file in Merge Resolver`
- `Merge Resolver: Set Anthropic API key`
- `Merge Resolver: Change open behavior`

## Usage

- When a merge or rebase stops with conflicts, the extension detects it and prompts to open the resolver. By default it arranges the workbench in **focus mode**: primary sidebar + merge editor, nothing else.
- You can also open any file in the resolver manually via **Merge Resolver: Open current file in Merge Resolver**.
- After resolving every conflict click **Save** — resolved files are staged automatically, and the merge/rebase can be continued.

## Requirements

- The built-in `vscode.git` extension must be enabled.
- Optional: an Anthropic API key for AI suggestions.

## License

MIT

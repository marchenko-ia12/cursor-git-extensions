# Git Branch Switcher

A JetBrains-style branches popup for VS Code and Cursor. Pick a branch, drill down into actions, and switch between multiple repositories in the same popup — all without leaving the keyboard.

## Features

- **Keyboard-first popup** — `Cmd+Shift+\`` (macOS) / `Ctrl+Shift+\`` opens a QuickPick listing all branches.
- **Multi-repo support** — in a workspace with several repositories the popup shows them all, each with a colored dot and its current branch. Switch repositories inline without closing the popup.
- **Drill-down actions** — pressing Enter on a branch opens a nested action menu (Checkout, Merge, Rebase, Push, Pull, Compare, Show log, Rename, Delete, New branch from here). A "Back to branches" item returns you to the branch list.
- **Push / Pull with remote selection** — if there is no upstream, the extension prompts for a remote and sets it up with `push -u`.
- **Compare branches** — opens a markdown document showing commits that are ahead and behind relative to the current branch.
- **Show log** — opens `git log --graph --decorate` output for any branch in a new editor tab.
- **Status bar integration** — a branch indicator and a sync indicator with ahead/behind counts.
- **Auto-scanning of workspace** — nested repos up to depth 3 are discovered automatically even when the built-in Git scanner misses them.

## Usage

- Open the popup: `Cmd+Shift+\`` / `Ctrl+Shift+\`` or run **Git Branch Switcher: Show Branches Popup** from the command palette.
- Click the branch name in the status bar to open the popup.
- Click the sync icon in the status bar to fetch and pull the current branch.

## Requirements

- The built-in `vscode.git` extension must be enabled.

## License

MIT

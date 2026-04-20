# Changelog

## 0.1.0

Initial release.

- Auto-opens in a separate window when a merge or rebase halts on a
  conflict.
- JetBrains-style 3-way merge UI: Yours / Base / Theirs panes with
  mini-map navigation and color-coded resolution status.
- `F7` / `Shift+F7` to step between conflicts, with undo history.
- Git log per side for both branches.
- Abort merge / rebase from the editor.
- Optional AI-assisted suggestions via the Anthropic API; the key is
  stored in VS Code SecretStorage.

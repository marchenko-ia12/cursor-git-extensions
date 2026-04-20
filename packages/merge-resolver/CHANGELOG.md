# Changelog

## 0.2.0

### Changed

- Diff visuals tuned to match modern 3-way diff tools:
  - Only actually changed lines are tinted (no more full-column wash).
  - Uses the theme's `merge-currentContentBackground` /
    `merge-incomingContentBackground` variables for stronger
    theme-aware colors.
  - Left gutter with `−` / `+` markers per changed line, like in a git
    diff.
  - `↓ or ↓` separator between Yours and Theirs in the Result pane
    when the conflict is unresolved or "Both" is picked.
  - Context lines are dimmed so the eye lands on the conflict.

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

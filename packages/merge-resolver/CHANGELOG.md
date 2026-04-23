# Changelog

## 0.5.0

### Changed

- **Inline per-side accept / reject buttons**, IntelliJ-style.
  Every conflict slot in the Yours and Theirs panes now carries a
  floating toolbar:
  - `»` / `«` — accept this side.
  - `×` — reject this side (pick the other one instead).

  Always visible, no hover required.
- **Red / green tint** for conflict lines, using the editor's native
  diff vars (`--vscode-diffEditor-removedLineBackground` and
  `...insertedLineBackground`). Yours lines read as "will be removed",
  Theirs lines as "will be added" — same visual language as a plain
  git diff.
- Conflict-slot borders now use `gitDecoration-*` colors to match the
  red/green scheme.

## 0.4.0

### Added

- **`⊘ Discard` button** per conflict — drops **both** Yours and
  Theirs and resolves the conflict to empty content. Use it when
  neither side is what you want (e.g. the whole block was added by
  mistake on both branches, or the code moved elsewhere). The
  conflict immediately counts as resolved, so it stops blocking
  **Save**.
- New `{ kind: "none" }` resolution type backing it.

## 0.3.0

### Added

- **`mergeResolver.openBehavior`** setting — controls how the editor
  places the merge view when a conflict auto-opens:
  - `focusMode` (new default, Claude-Code-style) — close the bottom
    panel, the right auxiliary bar, and every other editor group.
    Keep the primary sidebar intact. You end up with `sidebar |
    merge editor` and nothing else.
  - `newWindow` — previous default. Move the merge editor into its
    own OS window.
  - `current` — open and leave everything as it was.
- Command `Merge Resolver: Change open behavior` jumps straight to
  the setting in the Settings UI.

### Changed

- Default open behavior is now `focusMode`. Set
  `mergeResolver.openBehavior` back to `newWindow` if you preferred
  the old 0.2.0 behavior.

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

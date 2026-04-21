# Changelog

## 0.5.0

### Added

- **Restart** — one-click stop-and-rerun for the currently running
  configuration. Shows up while a script is running:
  - Editor title bar: `↻` next to `⏹`.
  - Status bar: yellow refresh icon.
  - `package.json` CodeLens: `↻ Restart` next to `⏹ Stop`.
  - Command palette: `JB Runner: Restart running configuration`.
  - Keybinding: `Cmd+F5` / `Ctrl+F5` (matches IntelliJ's Rerun).

## 0.4.1

### Fixed

- `▶` / `⏹` no longer leak into chat-panel / webview title bars in
  Cursor. The buttons now only show on real file editors
  (`resourceScheme == file`).

## 0.4.0

### Added

- **`package.json` CodeLens** — a `▶ Run` line above every entry in
  `scripts: { ... }`. Click to launch that script through the runner
  (same terminal, MRU, status bar, all wired). While it runs the
  same line shows `⏹ Stop`.
- Setting `jbRunner.packageJsonCodeLens` (default `true`) to turn it
  off.
- Command `JB Runner: Run npm script (by cwd + name)` for scripted
  invocation (hidden from the palette).

## 0.3.1

### Changed

- **Add custom configuration…** is now the first item in the picker
  instead of the last — always visible, no need to scroll past long
  script lists.

## 0.3.0

### Added

- **Wizard now collects `cwd` and `env`.** `JB Runner: Add custom
  configuration` asks for working directory and environment variables
  in IntelliJ-style format (`KEY=value;OTHER=value`) — no more editing
  `settings.json` by hand for the common case.
- **Variable substitution** in `command`, `cwd`, and `env` values:
  - `${workspaceFolder}` — first workspace folder's absolute path
  - `${workspaceFolderBasename}` — its folder name
  - `${userHome}` — current user's home
  - `${env:NAME}` — host environment variable
  - `${cwd}`, `${pathSeparator}`

## 0.2.0

### Added

- **Custom configurations** via `jbRunner.configurations` in settings.
  Each entry has `name`, `command`, optional `cwd` and `env`. Runs any
  shell command (`make run`, `python manage.py runserver`, etc.) — not
  just npm scripts.
- Commands **`JB Runner: Add custom configuration`** (interactive) and
  **`JB Runner: Edit configurations (settings.json)`**.
- QuickPick now groups entries: **Recent** → **Custom** → **package.json
  scripts**, with an **Add custom configuration…** row at the bottom.
- JSON schema for `jbRunner.configurations` — IntelliSense in
  `settings.json`.

## 0.1.0

Initial release.

- Status bar picker for npm scripts with `▶` run / `⏹` stop.
- Editor title bar buttons (`▶` / `⏹`) with colored SVGs.
- Auto-discovers every `package.json` in the workspace
  (`node_modules` excluded). Monorepo-aware.
- Package manager detection: `bun.lockb` → `bun`, `pnpm-lock.yaml` →
  `pnpm`, `yarn.lock` → `yarn`, otherwise `npm`.
- One terminal per run, `Ctrl+C` stop with dispose fallback after
  1.5 s.
- Spinner in the status bar while running; MRU of the last 5 launched
  configs at the top of the picker.
- Keybindings: `Cmd/Ctrl+Alt+R` run, `Cmd/Ctrl+F2` stop,
  `Cmd/Ctrl+Alt+Shift+R` pick config.

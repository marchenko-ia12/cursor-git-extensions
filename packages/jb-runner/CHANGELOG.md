# Changelog

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

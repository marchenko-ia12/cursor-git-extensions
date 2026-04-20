# JB Runner

JetBrains-style run toolbar for VS Code and Cursor. Pick an npm script,
hit `▶`, stop with `⏹` — right from the status bar.

## Features

- **Status bar tri-state** — config picker → green `▶` run → red `⏹` stop.
- **Auto-discover** — scans every `package.json` in the workspace
  (node_modules excluded), exposes all `scripts` as run configurations.
- **Monorepo-aware** — multiple `package.json` files group by package
  name in the picker.
- **One terminal per run** — named `▶ <package>: <script>` so you
  always know which terminal is yours.
- **Clean stop** — sends `Ctrl+C` first, disposes the terminal after
  1.5 s if the process is still alive.
- **Remembers last pick** per workspace.

## Editor title bar buttons

`▶` and `⏹` are also contributed to the editor title bar (top-right,
next to the split and `⋮` icons). If they don't appear there, Cursor /
VS Code may have collapsed them into the `⋮` overflow menu by default
— open it, right-click the item and choose **Pin to Actions Bar** (or
drag it out). This is a one-time action per workspace.

If you prefer not to have them at all, set
`"workbench.editor.editorActionsLocation": "hidden"` — or just ignore
them and use the status bar / keybindings.

## Status bar

```
$(project) my-app: dev   ▶    $(terminal)   ⏹
│          │        │    │    │             │
│          │        │    │    │             └─ Stop (visible while running)
│          │        │    │    └─ Show output (visible while running)
│          │        │    └─ Run (hidden while running)
│          │        └─ Script name
│          └─ Package name (from package.json)
└─ Click to pick a different script
```

## Keybindings

| Action | Mac | Win / Linux |
| --- | --- | --- |
| Run current config | `Cmd+Alt+R` | `Ctrl+Alt+R` |
| Stop | `Cmd+F2` | `Ctrl+F2` |
| Pick config | `Cmd+Alt+Shift+R` | `Ctrl+Alt+Shift+R` |

## Commands

- `JB Runner: Run current configuration`
- `JB Runner: Stop running configuration`
- `JB Runner: Pick run configuration`
- `JB Runner: Show output of running configuration`

## License

MIT

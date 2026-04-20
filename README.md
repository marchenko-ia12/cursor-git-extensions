# Cursor Git Extensions

JetBrains-inspired git tooling for VS Code and Cursor.

## Packages

### [Git Branch Switcher](packages/branches-popup)

A JetBrains-style branches popup. Pick a branch, drill down into actions (Checkout / Merge / Rebase / Push / Pull / Compare / Log / Rename / Delete / New from here), and switch between multiple repositories in the same popup — all without leaving the keyboard.

- Multi-repo support with colored indicators
- Auto-scan of nested git repositories in the workspace
- Push / Pull with remote selection when no upstream is set
- Compare branches (ahead / behind commits)
- Log viewer per branch

### [Ocelot Merge Resolver](packages/merge-resolver)

*Six-shooter for your git conflicts.*

A JetBrains-style 3-way merge conflict resolver. Auto-opens in a separate window when a merge or rebase stops, shows Yours / Base / Theirs panes with mini-map navigation, git history per side, and optional AI-assisted suggestions via the Anthropic API.

- Mini-map with color-coded resolution status
- Prev / Next navigation (`F7` / `Shift+F7`) and undo history
- Abort merge / rebase
- Git log per side for both branches
- AI suggestions via Anthropic (optional, API key stored in SecretStorage)

## Development

```bash
npm install
npm run typecheck
npm run build
npm run package   # builds .vsix in each package
```

## License

MIT

# Changelog

## 0.2.1

### Changed

- The status-bar sync icon now **spins** (`$(sync~spin)`) while a
  fetch / pull is in progress — you can tell at a glance that the
  update actually started. The warning background is suppressed
  during the operation, then restored to its `behind > 0` state.

## 0.2.0

### Added

- **Smart Pull** — Pull and Update now handle divergent branches
  gracefully. When `git pull --ff-only` fails because both you and
  the remote have new commits, a Merge / Rebase picker appears (same
  idea as IntelliJ Smart Update). If the chosen strategy stops on a
  conflict, Ocelot Merge Resolver picks it up automatically.
- **Setting `branchesPopup.pullStrategy`** — pin a preference:
  `ask` *(default)*, `merge`, `rebase`, or `ffOnly`.

### Changed

- Pull operations auto-stash a wider set of dirty-tree errors
  (`unstaged changes`, `cannot pull with rebase`, …) before retrying.

## 0.1.0

Initial release.

- JetBrains-style branches popup via `Cmd+Shift+` `` / `Ctrl+Shift+` ``.
- Multi-repo support with colored indicators and auto-scan of nested
  git repositories in the workspace.
- Drill-down actions per branch: Checkout, Merge, Rebase, Push, Pull,
  Compare with current, Log, Rename, Delete, New from here.
- Push with remote picker when no upstream is set.
- Compare branches (ahead / behind commits) and a git log viewer per
  branch.

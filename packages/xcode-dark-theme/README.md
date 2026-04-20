# Xcode Dark (WebStorm port)

The `Xcode-Dark` color scheme from the JetBrains / WebStorm plugin by
[Antelle](https://github.com/antelle/intellij-xcode-dark-theme), ported to
VS Code and Cursor.

Activates as **Xcode Dark (WebStorm)** in the color theme picker
(`Cmd+K Cmd+T` / `Ctrl+K Ctrl+T`).

## Palette

| Element | Color |
| --- | --- |
| Editor background | `#292a30` |
| UI background | `#323333` |
| Selection / tab underline | `#1D7BED` |
| Comments | `#7f8c99` |
| Keywords (bold) | `#f97bb0` |
| Strings | `#ff806c` |
| Numbers | `#d7c781` |
| Classes | `#82e6ff` |
| Interfaces | `#65dfff` |
| Functions / methods | `#75c2b3` |
| Fields / types | `#49b0ce` |
| Globals / predefined | `#b37eee` |
| Decorators | `#f19a9a` |
| HTML / XML tags | `#fd7cb2` |

## Install

From the color theme picker — search for **Xcode Dark (WebStorm)**.

Or from the command line:

```bash
cursor --install-extension marchenko-ia12.xcode-dark-theme
# or for VS Code:
code --install-extension marchenko-ia12.xcode-dark-theme
```

## Recommended pairing

The original Xcode-Dark scheme uses SF Mono at 16pt. In VS Code / Cursor:

```json
{
  "editor.fontFamily": "SF Mono, Menlo, monospace",
  "editor.fontSize": 14,
  "editor.lineHeight": 1.5
}
```

## License

MIT. Original color scheme © [Antelle](https://github.com/antelle/intellij-xcode-dark-theme).

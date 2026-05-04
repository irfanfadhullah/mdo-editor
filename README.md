# MDO Viewer

A cross-platform Electron block editor for `.mdo` (Markdown Object) and `.md` files. Combines a rich **WYSIWYG block editor** with a polished **read-only viewer** — all in one app.

## Features

### Editing
- **23 block types** — headings, lists, code, tables, columns, quotes, callouts, images, video, audio, embeds, PDF, and more
- **Slash commands** — type `/code`, `/img`, `/h1`, `/table` etc. to switch block types instantly
- **Block type picker** — click the `▾` arrow next to "Add a block" for a categorized menu
- **Inline formatting** — bold, italic, strikethrough, inline code, links, inline images, inline math
- **Shift+Enter** splits a block at cursor and creates a new one below
- **Backspace** on empty block deletes it
- **Tabbed interface** — work on multiple documents simultaneously
- **Auto-save** — changes are debounced and tracked

### Viewing
- **Read-only viewer mode** — rendered markdown preview with inline formatting
- **Outline panel** (right sidebar) — click any heading to jump to that section
- **Ctrl+Click** links to open in system browser
- **Drag & drop** files onto the window to open them

### File Support
| Format | Read | Write | Archive browse |
|--------|------|-------|----------------|
| `.md` | Yes | Yes | — |
| `.mdo` | Yes | — | Yes (inline browser) |
| Images, video, audio | Yes (preview) | — | — |

### `.mdo` Archive Format
`.mdo` files are ZIP archives containing:
- `manifest.json` — metadata (title, version, files list, creation date)
- `document.md` — the main Markdown document
- `assets/` — images, video, audio referenced by the document

## Screenshots

```
┌────────────────────────────────────────────────────────────┐
│ [New] [Open] [Folder] [Extract]      [Edit]  filename.md  │  ← Toolbar
├──────────┬─────────────────────────────────┬──────────────┤
│ Explorer │  ┌─────────────────────────┐    │   Outline    │
│          │  │ # Heading 1             │    │              │
│  📁 docs/│  │                         │    │  Heading 1   │
│  📝 a.md │  │  + Add a block  ▾       │    │  Heading 2   │
│  📝 b.md │  │                         │    │              │
│  📦 x.mdo│  │  > Quote block          │    │              │
│          │  │                         │    │              │
│          │  │  + Add a block  ▾       │    │              │
│          │  └─────────────────────────┘    │              │
├──────────┴─────────────────────────────────┴──────────────┤
│ [📝 a.md ×] [📝 b.md ×]                           [+ New]│  ← Tabs
└────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (included with Node.js)

### Development

```bash
git clone https://github.com/mdo-editor/mdo-editor.git
cd mdo-editor/gui-new
npm install
npm start
```

### Build

Build for Linux (`.deb` + `.AppImage`):

```bash
cd gui-new
npm run build:linux
```

Build for macOS (`.dmg`):

```bash
npm run build:mac
```

Or use the build script from the project root:

```bash
./scripts/build-electron.sh
```

Output goes to `gui-new/dist/`:

```
dist/
├── MDO Viewer-0.1.0.AppImage      # Portable Linux
├── mdo-viewer_0.1.0_amd64.deb     # Debian/Ubuntu
└── linux-unpacked/                 # Standalone directory
```

### Install

**Debian/Ubuntu:**
```bash
sudo dpkg -i mdo-viewer_0.1.0_amd64.deb
```

**AppImage (any Linux):**
```bash
chmod +x "MDO Viewer-0.1.0.AppImage"
./"MDO Viewer-0.1.0.AppImage"
```

## Project Structure

```
mdo-editor/
├── README.md
├── .gitignore
├── scripts/
│   └── build-electron.sh
└── gui-new/                    # Electron application
    ├── package.json             # Dependencies & build config
    ├── main.js                  # Electron main process (IPC, menus, windows)
    ├── preload.js               # Context bridge (mdoAPI)
    ├── USAGE.md                 # Full usage guide
    └── src/
        ├── index.html           # Main window layout
        ├── editor.html          # Full-screen editor layout
        ├── js/
        │   ├── blocks.js        # Block engine: types, parser, serializer, renderer, slash menu
        │   ├── app.js           # Main application: tabs, save, sidebar, edit toggle, IPC
        │   └── editor.js        # Full-screen editor controller
        ├── styles/
        │   ├── main.css         # Design system, layout, toolbar, sidebar, panels
        │   └── blocks.css       # Block-specific styles, slash menu, picker
        └── assets/
            └── mdo-view.png     # App icon
```

## Architecture

| Component | File(s) | Role |
|-----------|---------|------|
| **Main process** | `main.js` | Window management, IPC handlers, file system, menus |
| **Preload bridge** | `preload.js` | Exposes `mdoAPI` to renderer via `contextBridge` |
| **Block engine** | `blocks.js` | 23 block type registry, markdown↔blocks parser/serializer, DOM renderer, slash menu |
| **App controller** | `app.js` | Tab management, sidebar file explorer, edit/view toggle, outline panel, save |
| **Editor window** | `editor.js` | Standalone full-screen editor, file attach, save-as |
| **Styles** | `main.css` + `blocks.css` | macOS-inspired design system, light/dark mode, 830+ lines |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save current document |
| `Ctrl+O` | Open file dialog |
| `Ctrl+N` | New untitled document |
| `Enter` | New line inside current block |
| `Shift+Enter` | Split block at cursor, create new block below |
| `Backspace` | Delete empty block |
| `/` | Open slash command menu |
| `↑` `↓` | Navigate slash menu / picker |
| `Escape` | Close slash menu / picker |
| `Ctrl+Click` | Open link in system browser |

## All Block Types

| Block | Slash command | Shortcut | Category |
|-------|--------------|----------|----------|
| Text | `/text` | `t` | Basic |
| Heading 1 | `/h1` | `h1` | Basic |
| Heading 2 | `/h2` | `h2` | Basic |
| Heading 3 | `/h3` | `h3` | Basic |
| Page | `/page` | `page` | Basic |
| Bulleted List | `/ul` | `ul` | Lists |
| Numbered List | `/ol` | `ol` | Lists |
| To-do List | `/todo` | `todo` | Lists |
| Toggle List | `/toggle` | `toggle` | Lists |
| Quote | `/q` | `q` | Content |
| Callout | `/callout` | `callout` | Content |
| Code Block | `/code` | `code` | Content |
| Divider | `/div` | `div` | Content |
| Table | `/table` | `table` | Content |
| Columns | `/cols` | `cols` | Layout |
| Image | `/img` | `img` | Media |
| Video | `/vid` | `vid` | Media |
| Audio | `/aud` | `aud` | Media |
| File | `/file` | `file` | Media |
| Embed | `/embed` | `embed` | Media |
| Bookmark | `/link` | `link` | Media |
| Equation | `/math` | `math` | Technical |
| PDF | `/pdf` | `pdf` | Media |

Media types (image, video, audio, file, PDF) auto-open a file picker. Embed and bookmark prompt for a URL.

## Inline Formatting

In text and heading blocks, Markdown syntax is rendered inline:

| Syntax | Result |
|--------|--------|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `***bold italic***` | ***bold italic*** |
| `` `code` `` | `code` |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `$E=mc^2$` | inline math |
| `[link](https://example.com)` | hyperlink |
| `![alt](image.png)` | inline image |

## License

MIT

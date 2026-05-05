# MDO Viewer

A cross-platform **block-based WYSIWYG editor** for `.mdo` (Markdown Object) and `.md` files — built with Electron. View, edit, and create rich documents with 23 block types, inline formatting, embedded media, and archive packaging.

## Features

### Block Editor
- **23 block types** across 6 categories — text, headings, lists, code, tables, columns, quotes, callouts, media embeds, equations, and more
- **Slash commands** — type `/` in any block to open a searchable menu of all block types. Filter by name, ID, or shortcut (`/code`, `/h1`, `/img`, `/table`...)
- **Block type picker** — click the `▾` arrow next to any "Add a block" button for a categorized dropdown menu
- **Shift+Enter** to split a block at the cursor and create a new one below
- **Backspace** on empty block to delete it
- **Tabbed interface** — multiple documents open simultaneously with close buttons
- **Inline formatting** — bold, italic, strikethrough, inline code, links, inline images, LaTeX math

### Viewer Mode
- **Read-only rendered preview** with all formatting rendered
- **Outline panel** (right sidebar) — click any heading to jump to that section
- **Ctrl+Click** links to open in system browser
- **Drag & drop** files onto the window to open them
- **Resizable panels** — drag borders between sidebar/content/outline

### File Formats

| Format | Read | Edit | Save | Archive browse | Notes |
|--------|------|------|------|----------------|-------|
| `.md` | Yes | Yes | Yes (as `.md`) | — | Standard markdown |
| `.mdo` | Yes | Yes | Yes (as `.mdo`) | Yes | ZIP archive with assets |
| Images (jpg/png/gif/webp/svg) | Preview | — | — | — | Opens in image block |
| Video (mp4/webm/mov) | Playback | — | — | — | Opens in video block |
| Audio (mp3/wav/ogg) | Playback | — | — | — | Opens in audio block |
| PDF | Preview | — | — | — | Opens in PDF block |

### `.mdo` Archive Format

`.mdo` files are ZIP archives containing a structured document with embedded media:

```
document.mdo
├── manifest.json       # Archive metadata (title, version, file list, MIME types, SHA256)
├── metadata.json       # Block-level metadata (all blocks, media references, relations)
├── document.md         # The main Markdown document
└── assets/             # Embedded media files
    ├── image.jpg
    ├── video.mp4
    └── document.pdf
```

When you open, edit, and re-save a `.mdo`:
- `document.md` is regenerated from the current block state
- `metadata.json` is regenerated from the current block state (block types, media IDs, relations)
- `manifest.json` is updated (timestamp, title, file list)
- All `assets/` files are preserved from the source archive
- New media added via the editor gets bundled into `assets/`

---

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

### Build (Linux)

```bash
cd gui-new
npm run build:linux
```

Output:

```
gui-new/dist/
├── MDO Viewer-0.1.0.AppImage    # Portable (any Linux)
├── mdo-viewer_0.1.0_amd64.deb   # Debian / Ubuntu
└── linux-unpacked/              # Standalone directory
```

### Build (macOS)

```bash
npm run build:mac
```

### Install

```bash
# .deb (Debian / Ubuntu)
sudo dpkg -i mdo-viewer_0.1.0_amd64.deb

# .AppImage (any Linux)
chmod +x "MDO Viewer-0.1.0.AppImage"
./"MDO Viewer-0.1.0.AppImage"
```

---

## Project Structure

```
mdo-editor/
├── .gitignore
├── README.md
├── scripts/
│   └── build-electron.sh        # One-command build script
└── gui-new/                     # Electron application
    ├── package.json             # Dependencies & electron-builder config
    ├── main.js                  # Main process: window mgmt, IPC handlers, menus
    ├── preload.js               # Context bridge: exposes mdoAPI to renderer
    ├── mdo-archive.js           # .mdo ZIP writer (manifest + metadata + assets)
    ├── USAGE.md                 # Full user guide
    └── src/
        ├── index.html           # Main window (3-panel layout)
        ├── editor.html          # Full-screen standalone editor
        ├── js/
        │   ├── blocks.js        # Block engine (~1560 lines)
        │   │                     #   • 23 block type registry
        │   │                     #   • Markdown → blocks parser
        │   │                     #   • Blocks → Markdown serializer
        │   │                     #   • Block → DOM renderer
        │   │                     #   • DOM → Block reader
        │   │                     #   • Slash command menu
        │   │                     #   • Inline content renderer
        │   │                     #   • Media loading helpers
        │   │                     #   • .mdo archive payload builder
        │   ├── app.js            # Main app controller (~990 lines)
        │   │                     #   • Tab management
        │   │                     #   • File opening (.md / .mdo / preview)
        │   │                     #   • Save (plain markdown or .mdo archive)
        │   │                     #   • Edit / View mode toggle
        │   │                     #   • Sidebar file explorer
        │   │                     #   • Outline panel
        │   │                     #   • Resizable panels
        │   │                     #   • Context menu
        │   │                     #   • Keyboard shortcuts
        │   └── editor.js         # Full-screen editor (~380 lines)
        │                         #   • Block picker toolbar
        │                         #   • File attach
        │                         #   • Save / Save As
        ├── styles/
        │   ├── main.css          # Design system (macOS-inspired, light/dark)
        │   └── blocks.css        # Block styles, slash menu, picker, add buttons
        └── assets/
            └── mdo-view.png      # App icon
```

## Architecture

| Component | Files | Role |
|-----------|-------|------|
| **Main process** | `main.js` | Electron lifecycle, window creation, IPC handlers for file system, dialogs, archive I/O, media loading |
| **Preload bridge** | `preload.js` | `contextBridge` — exposes `mdoAPI` with 20+ safe APIs to the renderer |
| **Block engine** | `blocks.js` | Core — type registry, markdown parser, serializer, DOM renderer, block reader, slash menu, inline renderer, archive payload builder, media load helpers |
| **App controller** | `app.js` | Orchestrator — tabs, file open/save, edit/view toggle, sidebar explorer, outline panel, context menus, keyboard shortcuts, resize handling |
| **Editor window** | `editor.js` | Standalone full-screen editor with title input, block picker toolbar, attach files, save/save-as |
| **Archive writer** | `mdo-archive.js` | Node.js module — creates `.mdo` ZIPs with `manifest.json`, `metadata.json`, `document.md`, and asset files |
| **Design system** | `main.css` + `blocks.css` | macOS-inspired look with CSS variables, light/dark mode, responsive panels, animations |

## Keyboard Shortcuts

| Shortcut | Context | Action |
|---|---|---|
| `Ctrl+S` / `Cmd+S` | Global | Save document (.md as markdown, .mdo as archive) |
| `Ctrl+O` / `Cmd+O` | Global | Open file dialog |
| `Ctrl+N` / `Cmd+N` | Global | New untitled document |
| `Enter` | Edit mode | New line inside current block |
| `Shift+Enter` | Edit mode | Split block at cursor → new block below |
| `Backspace` | Edit mode | Delete empty block (keeps last remaining) |
| `/` | Edit mode | Open slash command menu |
| `↑` / `↓` | Menu open | Navigate slash menu / block picker |
| `Enter` | Menu open | Select highlighted item |
| `Escape` | Menu open | Close menu |
| `Ctrl+Click` | Any | Open link in system browser |

---

## All 23 Block Types

### Basic
| Type | Slash | Shortcut | Description |
|------|-------|----------|-------------|
| Text | `/text` | `t` | Standard paragraph with inline formatting |
| Heading 1 | `/h1` | `h1` | Largest heading (36px) |
| Heading 2 | `/h2` | `h2` | Medium heading (26px) |
| Heading 3 | `/h3` | `h3` | Small heading (20px) |
| Page | `/page` | `page` | Internal page link |

### Lists
| Type | Slash | Shortcut | Description |
|------|-------|----------|-------------|
| Bulleted List | `/ul` | `ul` | Unordered `•` items |
| Numbered List | `/ol` | `ol` | Auto-incrementing `1.` items |
| To-do List | `/todo` | `todo` | Checkbox items (click to toggle) |
| Toggle List | `/toggle` | `toggle` | Collapsible `▶` section |

### Content
| Type | Slash | Shortcut | Description |
|------|-------|----------|-------------|
| Quote | `/q` | `q` | Left-border blockquote, italic |
| Callout | `/callout` | `callout` | Highlighted box with icon (💡 default) |
| Code Block | `/code` | `code` | Monospace pre with language label |
| Divider | `/div` | `div` | Horizontal rule `---` |
| Table | `/table` | `table` | Editable grid with header row |

### Layout
| Type | Slash | Shortcut | Description |
|------|-------|----------|-------------|
| Columns | `/cols` | `cols` | Multi-column side-by-side layout |

### Media & Embeds
| Type | Slash | Shortcut | Prompt |
|------|-------|----------|--------|
| Image | `/img` | `img` | File picker → embedded image with caption |
| Video | `/vid` | `vid` | File picker → video player |
| Audio | `/aud` | `aud` | File picker → audio player |
| File | `/file` | `file` | File picker → clickable attachment card |
| PDF | `/pdf` | `pdf` | File picker → embedded PDF viewer |
| Embed | `/embed` | `embed` | URL prompt → iframe embed |
| Bookmark | `/link` | `link` | URL prompt → styled link card |

### Technical
| Type | Slash | Shortcut | Description |
|------|-------|----------|-------------|
| Equation | `/math` | `math` | LaTeX display math block |

---

## Inline Formatting

Available in **Text**, **Heading**, **List**, and **Quote** blocks:

| Input | Output |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `***bold italic***` | ***bold italic*** |
| `` `code` `` | `code` (monospace) |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `$E=mc^2$` | inline LaTeX math |
| `[text](https://example.com)` | hyperlink |
| `![alt](image.png)` | inline image |

---

## License

MIT

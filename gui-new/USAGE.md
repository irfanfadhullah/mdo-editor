# MDO Viewer — Complete Usage Guide

## Overview

MDO Viewer is a block-based WYSIWYG document editor with two modes:

- **View mode** (default) — read-only rendered preview of your document
- **Edit mode** — full block editor with slash commands, type picker, inline formatting, and media embedding

Toggle between modes with the **✏ Edit / 👁 View** button in the toolbar.

---

## Interface

```
┌─────────────────────────────────────────────────────────────┐
│  New  Open  Folder  Extract         Edit    filename.mdo    │ Toolbar
├───────────┬────────────────────────────────┬────────────────┤
│ Explorer  │  ┌────────────────────────┐    │ Outline        │
│           │  │ # Heading 1            │    │                │
│  📁 docs  │  │                        │    │ Heading 1      │
│  📝 a.md  │  │ + Add a block ▾        │    │ Heading 2      │
│  📝 b.md  │  │                        │    │ Subsection     │
│  📦 x.mdo │  │ > Quote block          │    │                │
│           │  │                        │    │                │
│           │  │ + Add a block ▾        │    │                │
│           │  └────────────────────────┘    │                │
├───────────┴────────────────────────────────┴────────────────┤
│  📝 a.md ×  📝 b.md ×                             + New Tab │ Tabs
└─────────────────────────────────────────────────────────────┘
```

### Panels

| Panel | Location | Purpose |
|-------|----------|---------|
| **Explorer** | Left sidebar | Browse folders, open files, expand `.mdo` archives |
| **Editor** | Center | Block editor / viewer content |
| **Outline** | Right sidebar | Document headings — click to jump to section |
| **Tabs** | Bottom | Switch between open documents |

Resize panels by dragging the borders between them.

---

## Edit Mode

### Visual Indicators

When you enter edit mode:
- The editor background tints slightly
- Block drag handles (6 dots) appear on the left of each block (visible on hover)
- **+ Add a block ▾** buttons appear between every block
- Text and heading blocks become editable (click to type)
- Media blocks remain read-only visually but can be replaced via the slash menu

### Creating Blocks

There are three ways to add blocks:

1. **+ Add a block** — click to insert a plain text block at that position
2. **▾ arrow** — hover over the add button, then click the arrow to open the block type picker with all 23 types categorized. Selecting a media type opens a file picker; URL types prompt for a URL
3. **Shift+Enter** — from inside any block, splits the block at the cursor and creates a new one below

### Changing Block Types

Once a block exists, change its type with **slash commands**:

1. Click into the block to focus it
2. Type `/` to open the slash command menu
3. Continue typing to filter (e.g., `/code`, `/h1`, `/img`)
4. Navigate with `↑` `↓` arrows, press `Enter` to select

### Deleting Blocks

- **Backspace** on an empty block deletes it (the last remaining block is kept)
- **Backspace** on an empty non-text block first converts it to text, then deletes on second press

### Enter vs Shift+Enter

| Key | Behavior |
|-----|----------|
| **Enter** | Inserts a new line inside the current block |
| **Shift+Enter** | Splits the block at the cursor — everything after the cursor becomes a new block below (same type) |

---

## Block Type Picker

The `▾` arrow appears on hover next to any **+ Add a block** button. Click it to open a categorized dropdown of all 23 block types:

| Category | Types |
|----------|-------|
| **Basic** | Text, Heading 1, Heading 2, Heading 3, Page |
| **Lists** | Bulleted List, Numbered List, To-do List, Toggle List |
| **Content** | Quote, Callout, Code Block, Divider, Table |
| **Layout** | Columns |
| **Media & Embeds** | Image, Video, Audio, File, Embed, Bookmark, PDF |
| **Technical** | Equation |

When you select a **media type** (image, video, audio, file, PDF), a file picker dialog opens automatically. Select a file and it's embedded. For `.mdo` archives, the file is bundled into the `assets/` directory on save.

When you select an **URL type** (embed, bookmark), a prompt dialog appears asking for the URL.

---

## Slash Commands

Type `/` in any editable block. The menu shows matching types filtered by name, ID, or shortcut.

### Complete Command Reference

| Type `/...` | Also works with | Block |
|-------------|-----------------|-------|
| `/t` | `/text` | Text |
| `/h1` | `/heading1` | Heading 1 |
| `/h2` | `/heading2` | Heading 2 |
| `/h3` | `/heading3` | Heading 3 |
| `/page` | — | Page |
| `/ul` | `/bulletedlist` | Bulleted List |
| `/ol` | `/numberedlist` | Numbered List |
| `/todo` | `/todolist` | To-do List |
| `/toggle` | `/togglelist` | Toggle List |
| `/q` | `/quote` | Quote |
| `/callout` | — | Callout |
| `/code` | `/codeblock` | Code Block |
| `/div` | `/divider` | Divider |
| `/table` | — | Table |
| `/cols` | `/columns` | Columns |
| `/img` | `/image` | Image (file picker) |
| `/vid` | `/video` | Video (file picker) |
| `/aud` | `/audio` | Audio (file picker) |
| `/file` | — | File (file picker) |
| `/embed` | — | Embed (URL prompt) |
| `/link` | `/bookmark` | Bookmark (URL prompt) |
| `/math` | `/equation` | Equation |
| `/pdf` | — | PDF (file picker) |

---

## Inline Formatting

Inside Text, Heading, List, and Quote blocks, use Markdown syntax:

| Type | Example | Result |
|------|---------|--------|
| Bold | `**hello**` | **hello** |
| Italic | `*hello*` | *hello* |
| Bold + Italic | `***hello***` | ***hello*** |
| Inline Code | `` `code` `` | `code` |
| Strikethrough | `~~text~~` | ~~text~~ |
| Link | `[Google](https://google.com)` | hyperlink |
| Image | `![alt](path/to/img.jpg)` | inline image |
| Math | `$E=mc^2$` | inline LaTeX |

---

## Working with Files

### Opening Files

- **Toolbar Open button** → file dialog for `.md` or `.mdo`
- **Drag and drop** any supported file onto the window
- **File explorer** (left sidebar) → browse folders, click any file to open it
- **Open Folder** button → loads entire directory into the file explorer tree

### `.mdo` Archives

When you open an `.mdo` file:
1. The archive entries appear in the file explorer as an expandable tree
2. Click `document.md` to load it as the main document
3. Media referenced in the document (images, video, audio, PDF) load automatically from the archive

When you **save** an `.mdo`:
1. `document.md` is regenerated from the current block state
2. `metadata.json` is regenerated with the current block types, media IDs, and relations
3. `manifest.json` is updated with the current timestamp, title, and file list
4. All existing `assets/` files are preserved from the source archive
5. Any new media added via the editor gets bundled into `assets/`

### Saving

| Scenario | Behavior |
|----------|----------|
| New untitled document + `Ctrl+S` | Save As dialog → `.md` or `.mdo` |
| Editing existing `.md` + `Ctrl+S` | Overwrites file as plain markdown |
| Editing existing `.mdo` + `Ctrl+S` | Rebuilds the `.mdo` ZIP with updated manifest + metadata + document + assets |
| Save As (always `.mdo`) | Creates a new `.mdo` archive with all current assets bundled |

### Extracting Archives

The **Extract** button (enabled when an `.mdo` is open) extracts the full archive contents to a directory you choose.

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Save document |
| `Ctrl+O` / `Cmd+O` | Open file dialog |
| `Ctrl+N` / `Cmd+N` | New untitled document |

### Edit Mode

| Shortcut | Action |
|---|---|
| `Enter` | New line inside current block |
| `Shift+Enter` | Split block at cursor → new block below |
| `Backspace` | Delete empty block / convert non-text to text |
| `/` | Open slash command menu |

### Menu Navigation

| Shortcut | Action |
|---|---|
| `↓` / `↑` | Navigate items |
| `Enter` | Select highlighted item |
| `Escape` | Close menu |

---

## All Block Types — Detailed

### Text
Standard paragraph. Placeholder: *"Type / for commands…"*. Supports all inline formatting.

### Heading 1 / 2 / 3
Document headings for structure. Three visual sizes (36px / 26px / 20px). Appear in the **Outline** panel — click any heading there to scroll to it.

### Page
Internal page link for multi-page documents within an `.mdo` archive. Click to navigate.

### Bulleted List
Unordered items with `•` bullet prefix. Each item is its own block.

### Numbered List
Auto-incrementing numbered items (`1.`, `2.`, `3.`…). Counter resets per group.

### To-do List
Checkbox items. Click the checkbox to toggle between checked (strikethrough) and unchecked. State persists through save.

### Toggle List
Collapsible section. Click `▶` to expand, revealing hidden child content. Good for FAQs, spoilers, or details.

### Quote
Blockquote with a left accent border and italic styling. Multi-line quotes join adjacent `>` lines.

### Callout
Highlighted info box with an icon (default opens to 💡 but editable). Blue-tinted background with border. The icon and body text are independently editable.

### Code Block
Monospace preformatted text block. Spellcheck is disabled. An optional language label appears at the top-right corner (set by typing the language name in the code fence: ` ```javascript `).

### Divider
Horizontal rule separator. Non-editable — visual-only element. Serializes as `---`.

### Table
Editable grid. Header row is bold. Click any cell to type. Rows and columns persist through save/load. The markdown table format uses `| col1 | col2 |` with a separator row.

### Columns
Multi-column layout (2+ side-by-side columns). Each column is independently editable. Columns are responsive — they wrap on narrow screens.

### Image
Embedded image with an optional caption line below. Supports:
- Local files (`file:///path/to/image.jpg`)
- Remote URLs (`https://example.com/image.jpg`)
- Archive-relative paths (`assets/image.jpg` inside `.mdo`)

Selecting this type opens a **file picker** automatically.

### Video
Embedded video player with playback controls. Same path support as Image. Selecting opens a file picker.

### Audio
Embedded audio player with playback controls. Same path support. Selecting opens a file picker.

### File
Clickable file attachment card showing the file name. Click to attempt to open in the system default application. Selecting opens a file picker.

### Embed
Iframe embed for external web content. Selecting prompts for a URL.

### Bookmark
Styled link preview card with title, description, and URL. Clicking the card opens the URL in the browser. Selecting prompts for a URL.

### Equation
LaTeX math block in display mode. Rendered in a serif/math font, centered.

### PDF
Embedded PDF viewer using an iframe. Selecting opens a file picker. The PDF is bundled into the archive on `.mdo` save.

---

## Tips & Troubleshooting

### General
- **Outline panel** — click any heading to scroll directly to that section
- **Ctrl+Click** any link to open in your default browser
- **Right-click** in the editor for context menu: Copy selected text, Copy Link, Paste as new block
- **Tab close button** (`×`) closes that document — unsaved changes are tracked in memory
- **+ New Tab** button (bottom-right of tab bar) opens a blank document in a new tab

### Editing
- **Shift+Enter** in the middle of text splits everything after the cursor into a new block (same type)
- **Backspace** on empty heading/list/quote converts it to plain text first — press again to delete
- **View ↔ Edit** toggle lets you preview rendered output without leaving the app
- The slash menu scroll height adapts to available screen space — if near the bottom of the screen, the menu shrinks to fit

### Media
- Media files selected with the file picker are stored with `file://` absolute paths in `.md` files
- In `.mdo` archives, media is bundled into `assets/` with relative paths
- When editing an `.mdo`, existing assets are preserved and new ones are added on save
- Large media files may take a moment to load — the app loads them asynchronously

### Saving `.mdo` Files
- Always saves the complete archive: `manifest.json` + `metadata.json` + `document.md` + `assets/`
- `metadata.json` is regenerated from the current block state — edits, additions, deletions are all reflected
- The original `manifest.json` `files` array is updated with new media entries
- Existing asset files from the source archive are copied forward — nothing is lost
- If you want to save as plain markdown instead, use **Save As** and choose `.md` format

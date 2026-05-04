# MDO Viewer — Usage Guide

## Viewer vs Editor Mode

The app has two modes, toggled by the **✏ Edit / 👁 View** button in the toolbar:

| Mode | What you see | What you can do |
|------|-------------|-----------------|
| **View** (default) | Read-only rendered preview | Read, navigate outline, Ctrl+Click links |
| **Edit** | Full WYSIWYG block editor | Type, format, insert blocks, slash commands |

In **edit mode**:
- The background tints slightly to indicate editing state
- Block drag handles appear on the left of each block
- **+ Add a block ▾** buttons appear between every block
- Text blocks become editable (click to focus)
- Media blocks (images, video, etc.) remain read-only visually

Press `Ctrl+S` to save your changes at any time.

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Save document |
| `Ctrl+O` / `Cmd+O` | Open file dialog |
| `Ctrl+N` / `Cmd+N` | New untitled document |

### Editing (edit mode only)

| Shortcut | Action |
|---|---|
| `Enter` | New line inside current block |
| `Shift+Enter` | Split block at cursor → create new block below |
| `Backspace` | Delete empty block (won't delete last remaining block) |
| `Tab` | (List blocks) Prevent indent (reserved for future) |
| `Ctrl+Click` | Open link in system browser |

### Slash Menu Navigation

| Shortcut | Action |
|---|---|
| `/` | Open slash command menu |
| `↓` / `↑` | Navigate items |
| `Enter` | Select highlighted item |
| `Escape` | Close menu |

---

## Slash Commands (`/`)

Type `/` in any editable block to open the command menu. Continue typing to filter. The menu shows matching block types grouped by category.

### Filtering

You can filter by **name**, **ID**, or **shortcut**:

- `/code` matches "Code Block"
- `/h1` matches "Heading 1"  
- `/img` matches "Image"
- Just typing `/` shows all types

### Complete Command Reference

| Type in block | Result |
|---|---|
| `/t` or `/text` | Text paragraph |
| `/h1` or `/heading1` | Heading 1 (largest) |
| `/h2` or `/heading2` | Heading 2 |
| `/h3` or `/heading3` | Heading 3 |
| `/page` | Page link |
| `/ul` or `/bulletedlist` | Bulleted list |
| `/ol` or `/numberedlist` | Numbered list |
| `/todo` or `/todolist` | To-do list with checkbox |
| `/toggle` or `/togglelist` | Collapsible toggle |
| `/q` or `/quote` | Blockquote |
| `/callout` | Highlighted callout box |
| `/code` or `/codeblock` | Code block |
| `/div` or `/divider` | Horizontal divider |
| `/table` | Editable table |
| `/cols` or `/columns` | Multi-column layout |
| `/img` or `/image` | Image (opens file picker) |
| `/vid` or `/video` | Video (opens file picker) |
| `/aud` or `/audio` | Audio (opens file picker) |
| `/file` | File attachment (opens file picker) |
| `/embed` | URL embed (prompts for URL) |
| `/link` or `/bookmark` | Bookmark link (prompts for URL) |
| `/math` or `/equation` | LaTeX equation |
| `/pdf` | PDF embed (opens file picker) |

---

## Block Type Picker

In edit mode, each **+ Add a block** button has a `▾` arrow that appears on hover. Click `▾` to open a categorized dropdown of all 23 block types.

**Categories:**
- **Basic** — Text, Heading 1–3, Page
- **Lists** — Bulleted List, Numbered List, To-do List, Toggle
- **Content** — Quote, Callout, Code Block, Divider, Table
- **Layout** — Columns
- **Media & Embeds** — Image, Video, Audio, File, Embed, Bookmark, PDF
- **Technical** — Equation

**Media blocks** (image, video, audio, file, PDF) automatically open a file picker dialog when selected.

**URL blocks** (embed, bookmark) prompt for a URL in a dialog box.

Clicking **+ Add a block** (without `▾`) inserts a plain text block instantly.

---

## All Block Types

### Text
Standard paragraph block. Supports inline Markdown formatting.
- **Placeholder**: *Type / for commands…*
- **Editable**: Yes (content and inline formatting)

### Heading 1 / 2 / 3
Document headings for structure. Three sizes.
- **Placeholder**: *heading 1…*, *heading 2…*, *heading 3…*
- **Editable**: Yes (content and inline formatting)
- **Appears in**: Outline panel (right sidebar)

### Bulleted List
Unordered list items with `•` bullet prefix.

### Numbered List
Auto-incrementing numbered items.

### To-do List
Checkbox items. Click the checkbox to toggle checked (strikethrough).

### Toggle List
Collapsible section. Click the `▶` arrow to expand/collapse hidden content.

### Quote
Blockquote with left accent border and italic styling.

### Callout
Highlighted info box with an icon (default: 💡). Useful for tips, warnings, notes. The icon and body are separately editable.

### Code Block
Monospace preformatted text. Spellcheck disabled. Optional language label (e.g. `javascript`, `python`, `swift`) shown at top-right.

### Divider
Horizontal rule separator (`---`). Non-editable, visual only.

### Table
Editable grid with header row (bold). Click cells to type. Rows and columns persist through save/load.

### Columns
Multi-column layout (2+ columns side by side). Each column is independently editable.

### Image
Embedded image with optional caption line below. Supports:
- `file://` paths (local files)
- `http(s)://` URLs
- Archive-relative paths (inside `.mdo` files)

**Selecting this type from the picker or slash menu opens a file dialog automatically.**

### Video
Embedded video player with controls. Same path support as Image. File dialog opens on selection.

### Audio
Embedded audio player with controls. Same path support. File dialog opens on selection.

### File
Clickable file attachment card showing filename. Click to open in system default app. File dialog opens on selection.

### Embed
Iframe embed for external web content. Prompts for URL on selection.

### Bookmark
Styled link preview card with title, description, and URL. Click to open in browser. Prompts for URL on selection.

### Equation
LaTeX math block in display mode. Plain text input, monospace/italic rendering.

### Page
Internal page link for multi-page documents. Click to navigate.

### PDF
Embedded PDF viewer (iframe). File dialog opens on selection.

---

## Inline Formatting (Markdown)

Inside **Text**, **Heading**, **List**, and **Quote** blocks, use these Markdown patterns for rich text:

| Input | Rendered output |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `***bold italic***` | ***bold italic*** |
| `` `code` `` | `code` (monospace) |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `$E=mc^2$` | inline LaTeX math |
| `[link text](https://example.com)` | hyperlink |
| `![alt text](image.png)` | inline image |

---

## Working with Files

### Opening Files
- **Toolbar** → Open button → choose `.md` or `.mdo` file
- **Drag & drop** any file onto the window
- **File explorer** (left sidebar) → browse folders, click files to open
- **Tabs** open for each file; close with `×` button

### `.mdo` Archives
`.mdo` files are ZIP archives. When opened:
- The archive contents appear in the file explorer tree
- `document.md` loads as the main document
- Images and media inside the archive load automatically

### Saving
- `Ctrl+S` to save current document
- If the file is unnamed, a Save As dialog appears
- Files save as `.md` (Markdown) format
- Newly saved files appear in the file explorer

---

## Tips & Tricks

- **Outline panel** (right sidebar) lists all headings — click one to scroll there instantly
- **Ctrl+Click** any link to open it in your default browser
- **Resize panels** by dragging the borders between sidebar/content/outline
- **Right-click** in the editor for context menu (copy, paste as new block)
- **Multiple tabs** let you work on several documents and switch between them
- **Shift+Enter** in the middle of text splits: everything after the cursor becomes a new block below
- **Backspace** on an empty non-text block (heading, list, etc.) converts it to plain text — press Backspace again to delete it
- **View mode** shows fully rendered output: toggle between Edit ↔ View to preview your work

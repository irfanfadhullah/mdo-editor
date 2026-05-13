// ── MDO Viewer — Block Editor Engine ──────────────────────────

if (!window.BlockEditor) {
  window.BlockEditor = {};
}

const BlockEditor = window.BlockEditor;

// ── Obsidian / GFM Import Helpers ────────────────────────────

BlockEditor.importObsidian = function(markdown) {
  if (!markdown) return [];

  // Pre-process: Obsidian callouts
  var text = markdown.replace(/^>\s*\[!(\w+)\]\s*(.*?)(?:\n>|$)/g, function(m, type, title) {
    var icons = { note: '✏', warning: '⚠', tip: '💡', info: 'ℹ', danger: '🔥', abstract: '📋', todo: '☐', success: '✅', question: '❓', failure: '❌', example: '📐', quote: '❝' };
    var icon = icons[type.toLowerCase()] || '💡';
    return '<!-- callout -->\n> ' + icon + (title ? ' ' + title : '');
  });

  // Pre-process: wikilinks [[page]] → [page](page:page-id)
  text = text.replace(/\[\[([^\]]+)\]\]/g, function(m, page) {
    var parts = page.split('|');
    var target = parts[0].trim();
    var label = (parts[1] || parts[0]).trim();
    return '[' + label + '](page:' + target + ')';
  });

  // Pre-process: tags #tag → inline code style
  text = text.replace(/(?:^|\s)#([a-zA-Z][\w/-]*)/g, function(m, tag) {
    return ' `#' + tag + '`';
  });

  return BlockEditor.parseMarkdown(text);
};

BlockEditor.importNotion = function(markdown) {
  if (!markdown) return [];

  var text = markdown;
  // Notion toggle: ▶ then content
  text = text.replace(/^(\s*)▶\s*(.+)/gm, function(m, indent, title) {
    return '<!-- toggle -->\n<details>\n<summary>' + title + '</summary>\n';
  });
  text = text.replace(/<\/details>/g, '<!-- end toggle -->');
  // Notion callout with emoji
  text = text.replace(/^>\s*(💡|⚠|ℹ|🔥|✅|❌|📋|✏)\s*(.*)/gm, function(m, icon, content) {
    return '<!-- callout -->\n> ' + icon + (content ? ' ' + content : '');
  });

  return BlockEditor.parseMarkdown(text);
};

// ── Block Type Registry ───────────────────────────────────────

BlockEditor.TYPES = [
  { id: 'text',          label: 'Text',            icon: 'Aa',      category: 'basic',      shortcut: 't' },
  { id: 'heading-1',     label: 'Heading 1',       icon: 'H1',     category: 'basic',      shortcut: 'h1' },
  { id: 'heading-2',     label: 'Heading 2',       icon: 'H2',     category: 'basic',      shortcut: 'h2' },
  { id: 'heading-3',     label: 'Heading 3',       icon: 'H3',     category: 'basic',      shortcut: 'h3' },
  { id: 'page',          label: 'Page',            icon: '📄',      category: 'basic',      shortcut: 'page' },
  { id: 'bulleted-list', label: 'Bulleted List',   icon: '•',      category: 'lists',      shortcut: 'ul' },
  { id: 'numbered-list', label: 'Numbered List',   icon: '1.',     category: 'lists',      shortcut: 'ol' },
  { id: 'todo-list',     label: 'To-do List',      icon: '☐',      category: 'lists',      shortcut: 'todo' },
  { id: 'toggle-list',   label: 'Toggle',          icon: '▸',      category: 'lists',      shortcut: 'toggle' },
  { id: 'quote',         label: 'Quote',           icon: '❝',      category: 'content',    shortcut: 'q' },
  { id: 'callout',       label: 'Callout',         icon: '💡',     category: 'content',    shortcut: 'callout' },
  { id: 'code',          label: 'Code Block',      icon: '⌨',      category: 'content',    shortcut: 'code' },
  { id: 'divider',       label: 'Divider',         icon: '—',      category: 'content',    shortcut: 'div' },
  { id: 'table',         label: 'Table',           icon: '⊞',      category: 'content',    shortcut: 'table' },
  { id: 'columns',       label: 'Columns',         icon: '▦',      category: 'layout',     shortcut: 'cols' },
  { id: 'image',         label: 'Image',           icon: '🖼',     category: 'media',      shortcut: 'img' },
  { id: 'video',         label: 'Video',           icon: '🎬',     category: 'media',      shortcut: 'vid' },
  { id: 'audio',         label: 'Audio',           icon: '🎵',     category: 'media',      shortcut: 'aud' },
  { id: 'file',          label: 'File',            icon: '📎',     category: 'media',      shortcut: 'file' },
  { id: 'embed',         label: 'Embed',           icon: '🌐',     category: 'media',      shortcut: 'embed' },
  { id: 'bookmark',      label: 'Bookmark',        icon: '🔖',     category: 'media',      shortcut: 'link' },
  { id: 'equation',      label: 'Equation',        icon: '𝑓',      category: 'technical',  shortcut: 'math' },
  { id: 'mermaid',       label: 'Mermaid',         icon: '◈',      category: 'technical',  shortcut: 'mermaid' },
  { id: 'pdf',           label: 'PDF',             icon: '📋',     category: 'media',      shortcut: 'pdf' },
];

// ── Unique IDs ────────────────────────────────────────────────

let _idCounter = 0;
BlockEditor.nextId = () => 'block-' + (++_idCounter) + '-' + Date.now().toString(36);

// ── Block data helpers ───────────────────────────────────────

function cloneMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch (_) {
    return { ...meta };
  }
}

function fileNameFromPath(filePath) {
  if (!filePath) return '';
  return filePath.replace(/\\/g, '/').split('/').pop() || filePath;
}

function splitTableCells(row) {
  const cells = [];
  let current = '';
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '\\' && row[i + 1] === '|') { current += '|'; i++; }
    else if (row[i] === '|') { cells.push(current); current = ''; }
    else { current += row[i]; }
  }
  if (current || row[row.length - 1] === '|') cells.push(current);
  return cells;
}

function unescapeTableCell(cell) {
  return (cell || '').replace(/\\\|/g, '|');
}

function escapeTableCell(cell) {
  return (cell || '').replace(/\|/g, '\\|');
}

function asFileUrl(filePath) {
  if (!filePath) return '';
  if (/^(file|https?|data|blob):/i.test(filePath)) return filePath;
  return 'file://' + filePath;
}

BlockEditor.contentClassForType = function(type) {
  const aliases = {
    'heading-1': 'h1',
    'heading-2': 'h2',
    'heading-3': 'h3',
    code: 'code-block',
    table: 'table-block',
    columns: 'columns-block',
    image: 'image-block',
    video: 'embed-block',
    audio: 'embed-block',
    embed: 'embed-block',
    bookmark: 'bookmark-block',
    file: 'file-block',
    pdf: 'pdf-block file-block',
    equation: 'equation-block',
    mermaid: 'mermaid-block',
    page: 'page-block',
  };
  return [type, aliases[type]].filter(Boolean).join(' ');
};

BlockEditor.defaultBlockData = function(type = 'text', content = '', meta = {}) {
  const block = {
    id: BlockEditor.nextId(),
    type: type || 'text',
    content: content || '',
    meta: cloneMeta(meta),
  };

  switch (block.type) {
    case 'table':
      if (!block.content) {
        block.content = '| Header 1 | Header 2 |\n| --- | --- |\n| Cell | Cell |';
      }
      break;
    case 'columns':
      if (!block.meta.columns) {
        block.meta.columns = block.content
          ? block.content.split(/\n---col---\n/)
          : ['Column 1', 'Column 2'];
      }
      block.content = block.meta.columns.join('\n---col---\n');
      break;
    case 'toggle-list':
      if (!('children' in block.meta)) block.meta.children = '';
      break;
    case 'callout':
      if (!block.meta.icon) block.meta.icon = '💡';
      break;
    case 'page':
      if (!block.content) block.content = 'Untitled Page';
      if (!block.meta.id) block.meta.id = BlockEditor.nextId();
      break;
    case 'divider':
      block.content = '';
      break;
    case 'mermaid':
      if (!block.content) {
        block.content = 'graph TD\n  A[Start] --> B[Finish]';
      }
      break;
  }

  return block;
};

BlockEditor.promptForBlockMeta = async function(type, currentContent = '') {
  const meta = {};

  if (['image', 'video', 'audio', 'pdf', 'file'].includes(type)) {
    const paths = await window.mdoAPI?.openFile?.();
    if (!paths || !paths.length) return null;
    meta.src = asFileUrl(paths[0]);
    if (!currentContent) meta._content = fileNameFromPath(paths[0]);
    return meta;
  }

  if (type === 'embed') {
    const url = prompt('Enter embed URL:');
    if (!url) return null;
    meta.url = url;
    if (!currentContent) meta._content = url;
    return meta;
  }

  if (type === 'bookmark') {
    const url = prompt('Enter bookmark URL:');
    if (!url) return null;
    meta.url = url;
    if (!currentContent) meta._content = url.replace(/^https?:\/\//, '');
    return meta;
  }

  return meta;
};

BlockEditor.createBlock = async function(type = 'text', content = '', options = {}) {
  let meta = {};
  if (options.promptMeta !== false) {
    meta = await BlockEditor.promptForBlockMeta(type, content);
    if (meta === null) return null;
  }

  if (Object.prototype.hasOwnProperty.call(meta, '_content')) {
    content = meta._content;
    delete meta._content;
  }

  return BlockEditor.defaultBlockData(type, content, meta);
};

BlockEditor.storeBlockData = function(blockEl, block) {
  blockEl.__blockData = {
    id: block.id,
    type: block.type,
    content: block.content || '',
    meta: cloneMeta(block.meta),
  };
};

function storedBlockData(blockEl) {
  const stored = blockEl.__blockData || {};
  return {
    content: stored.content || '',
    meta: cloneMeta(stored.meta),
  };
}

function isExternalMediaSrc(src) {
  return /^(https?|data|blob):/i.test(src || '');
}

function localPathFromSrc(src) {
  if (!src) return '';
  if (src.startsWith('file://')) {
    const raw = src.replace(/^file:\/\//i, '');
    try { return decodeURIComponent(raw); } catch (_) { return raw; }
  }
  return src;
}

function assetEntryName(src, index) {
  const original = fileNameFromPath(localPathFromSrc(src));
  const fallback = 'asset-' + index;
  const safe = (original || fallback)
    .replace(/[<>:"\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
  return 'assets/' + safe;
}

function uniqueAssetEntryName(src, used, index) {
  const first = assetEntryName(src, index);
  const extIndex = first.lastIndexOf('.');
  const base = extIndex > 'assets/'.length ? first.slice(0, extIndex) : first;
  const ext = extIndex > 'assets/'.length ? first.slice(extIndex) : '';
  let candidate = first;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = base + '-' + suffix + ext;
    suffix++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function buildMetadata(blocks, title) {
  const metadataBlocks = [];
  const mediaList = [];
  const mediaMap = new Map();
  let mediaIdx = 1;

  for (const b of blocks) {
    const copy = {
      id: b.id,
      type: b.type,
      content: b.content || '',
    };

    if (b.type === 'code' && b.meta?.language) {
      copy.language = b.meta.language;
    }

    if (['image', 'video', 'audio', 'file', 'pdf'].includes(b.type)) {
      const src = b.meta?.src || '';
      if (src && !mediaMap.has(src)) {
        const mid = 'media-' + (mediaIdx++);
        mediaMap.set(src, mid);
        mediaList.push({
          id: mid,
          path: src,
          type: b.type,
        });
      }
      copy.mediaIds = [mediaMap.get(src)].filter(Boolean);
    }

    metadataBlocks.push(copy);
  }

  return {
    format: 'mdo-metadata',
    version: '1.0',
    title: title || 'Untitled',
    blocks: metadataBlocks,
    media: mediaList,
    relations: [],
  };
}

BlockEditor.createMdoArchivePayload = function(blocks, options = {}) {
  const archivePath = options.archivePath || null;
  const usedAssets = new Set();
  const assets = [];
  let assetIndex = 1;

  const packagedBlocks = (blocks || []).map(block => {
    const copy = {
      id: block.id,
      type: block.type,
      content: block.content || '',
      meta: cloneMeta(block.meta),
    };

    if (!['image', 'video', 'audio', 'file', 'pdf'].includes(copy.type)) {
      return copy;
    }

    const src = copy.meta?.src || '';
    if (!src || isExternalMediaSrc(src)) return copy;

    if (!copy.meta) copy.meta = {};

    if (src.startsWith('file://') || src.startsWith('/')) {
      const entryName = uniqueAssetEntryName(src, usedAssets, assetIndex++);
      assets.push({
        entryName,
        sourcePath: localPathFromSrc(src),
      });
      copy.meta.src = entryName;
      return copy;
    }

    const entryName = src.replace(/^\/+/, '');
    usedAssets.add(entryName.toLowerCase());
    if (archivePath) {
      assets.push({
        entryName,
        archivePath,
        sourceEntry: entryName,
      });
    }
    copy.meta.src = entryName;
    return copy;
  });

  const markdown = BlockEditor.serializeMarkdown(packagedBlocks);
  const files = ['document.md', ...assets.map(asset => asset.entryName)];
  const manifest = {
    format: 'mdo',
    version: '1.0',
    title: options.title || 'Untitled',
    document: 'document.md',
    metadata: 'metadata.json',
    files,
    assets: assets.map(asset => ({ path: asset.entryName })),
  };

  const metadata = buildMetadata(packagedBlocks, manifest.title);

  return { markdown, manifest, metadata, assets };
};

// ── Text offset helper for cursor split ──────────────────────
function getTextOffset(root, node, offset) {
  let pos = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  let n;
  while ((n = walker.nextNode())) {
    if (n === node) { pos += offset; break; }
    pos += n.textContent.length;
  }
  return pos;
}

function blockFromMarkdownLink(label, url) {
  const content = (label || '').trim();
  const href = (url || '').trim();
  if (/^page:/i.test(href)) {
    return { id: BlockEditor.nextId(), type: 'page', content, meta: { id: href.replace(/^page:/i, '') } };
  }
  if (/^Embed$/i.test(content)) {
    return { id: BlockEditor.nextId(), type: 'embed', content, meta: { url: href } };
  }
  if (/\.(png|jpg|jpeg|webp|gif|svg|bmp)(?:[?#].*)?$/i.test(href)) {
    return { id: BlockEditor.nextId(), type: 'image', content, meta: { src: href } };
  }
  if (/\.(mp4|webm|mov|mkv)(?:[?#].*)?$/i.test(href)) {
    return { id: BlockEditor.nextId(), type: 'video', content, meta: { src: href } };
  }
  if (/\.(mp3|wav|ogg|flac|aac)(?:[?#].*)?$/i.test(href)) {
    return { id: BlockEditor.nextId(), type: 'audio', content, meta: { src: href } };
  }
  if (/\.pdf(?:[?#].*)?$/i.test(href)) {
    return { id: BlockEditor.nextId(), type: 'pdf', content, meta: { src: href } };
  }
  if (/^https?:\/\//i.test(href)) {
    return { id: BlockEditor.nextId(), type: 'bookmark', content, meta: { url: href } };
  }
  return { id: BlockEditor.nextId(), type: 'file', content, meta: { src: href } };
}

function parseStandaloneBlockTokens(text) {
  const blocks = [];
  let pos = 0;
  const source = text || '';

  while (pos < source.length) {
    while (pos < source.length && /\s/.test(source[pos])) pos++;
    if (pos >= source.length) break;

    const rest = source.slice(pos);
    let match = rest.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (match) {
      blocks.push({
        id: BlockEditor.nextId(),
        type: 'image',
        content: match[1].trim(),
        meta: { src: match[2].trim() },
      });
      pos += match[0].length;
      continue;
    }

    match = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      blocks.push(blockFromMarkdownLink(match[1], match[2]));
      pos += match[0].length;
      continue;
    }

    match = rest.match(/^\$\$([\s\S]+?)\$\$/);
    if (match) {
      blocks.push({
        id: BlockEditor.nextId(),
        type: 'equation',
        content: match[1].trim(),
      });
      pos += match[0].length;
      continue;
    }

    return null;
  }

  return blocks.length ? blocks : null;
}

function firstEmbeddedStandaloneBlockIndex(text) {
  const source = text || '';
  const candidates = [];
  for (const token of ['![', '[', '$$']) {
    let idx = source.indexOf(token);
    while (idx > 0) {
      candidates.push(idx);
      idx = source.indexOf(token, idx + token.length);
    }
  }
  candidates.sort((a, b) => a - b);
  return candidates.find(idx => parseStandaloneBlockTokens(source.slice(idx))) ?? -1;
}

// ── Markdown → Blocks Parser ─────────────────────────────────

BlockEditor.parseMarkdown = function(markdown) {
  if (!markdown || !markdown.trim()) return [];
  const lines = markdown.split('\n');
  let blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (/^\s*$/.test(line)) { i++; continue; }

    const standaloneBlocks = parseStandaloneBlockTokens(line);
    if (standaloneBlocks) {
      blocks.push(...standaloneBlocks);
      i++;
      continue;
    }

    // Divider
    if (/^---\s*$/.test(line)) {
      blocks.push({ id: BlockEditor.nextId(), type: 'divider', content: line });
      i++; continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      if (level <= 3) {
        blocks.push({ id: BlockEditor.nextId(), type: 'heading-' + level, content: headingMatch[2] });
      } else {
        blocks.push({ id: BlockEditor.nextId(), type: 'heading-3', content: headingMatch[2] });
      }
      i++; continue;
    }

    // Code block (fenced)
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      let codeContent = '';
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeContent += (codeContent ? '\n' : '') + lines[i];
        i++;
      }
      i++; // skip closing ```
      if (/^mermaid$/i.test(lang)) {
        blocks.push({ id: BlockEditor.nextId(), type: 'mermaid', content: codeContent.trim() });
      } else if (/^(math|katex)$/i.test(lang)) {
        blocks.push({ id: BlockEditor.nextId(), type: 'equation', content: codeContent.trim() });
      } else {
        blocks.push({ id: BlockEditor.nextId(), type: 'code', content: codeContent, meta: { language: lang } });
      }
      continue;
    }

    // Equation block
    if (/^\$\$/.test(line)) {
      let equationContent = line.replace(/^\$\$/, '');
      i++;
      if (/\$\$\s*$/.test(equationContent)) {
        equationContent = equationContent.replace(/\$\$\s*$/, '');
      } else {
        while (i < lines.length && !/\$\$\s*$/.test(lines[i])) {
          equationContent += (equationContent ? '\n' : '') + lines[i];
          i++;
        }
        if (i < lines.length) {
          equationContent += (equationContent ? '\n' : '') + lines[i].replace(/\$\$\s*$/, '');
          i++;
        }
      }
      blocks.push({ id: BlockEditor.nextId(), type: 'equation', content: equationContent.trim() });
      continue;
    }

    // Quote
    if (/^>\s?/.test(line)) {
      let quoteContent = line.replace(/^>\s?/, '');
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteContent += '\n' + lines[i].replace(/^>\s?/, '');
        i++;
      }
      blocks.push({ id: BlockEditor.nextId(), type: 'quote', content: quoteContent });
      continue;
    }

    // Callout
    if (/^<!-- callout -->/.test(line)) {
      i++;
      let calloutContent = '';
      while (i < lines.length && !/^<!--/.test(lines[i]) && !/^\s*$/.test(lines[i])) {
        calloutContent += (calloutContent ? '\n' : '') + lines[i].replace(/^>\s?/, '');
        i++;
      }
      if (i < lines.length && /^\s*$/.test(lines[i])) i++;
      blocks.push({ id: BlockEditor.nextId(), type: 'callout', content: calloutContent });
      continue;
    }

    // Columns
    if (/^<!-- columns -->/.test(line)) {
      i++;
      let colContent = '';
      const isColumnBoundary = (candidate) => {
        const trimmed = (candidate || '').trim();
        if (!trimmed || /^<!--/.test(trimmed)) return true;
        if (/^---col---$/i.test(trimmed)) return false;
        return /^(#{1,6}\s|```|>\s?|[-*+]\s|\d+\.\s|!\[|---\s*$|\|.+\||\[.+\]\(.+\)\s*$|\$\$)/.test(trimmed);
      };
      let splitAtEmbeddedBlock = false;
      while (i < lines.length && !isColumnBoundary(lines[i])) {
        const embeddedIndex = firstEmbeddedStandaloneBlockIndex(lines[i]);
        if (embeddedIndex > 0) {
          const before = lines[i].slice(0, embeddedIndex).trimEnd();
          const after = lines[i].slice(embeddedIndex).trimStart();
          if (before) colContent += (colContent ? '\n' : '') + before;
          lines[i] = after;
          splitAtEmbeddedBlock = true;
          break;
        }
        colContent += (colContent ? '\n' : '') + lines[i];
        i++;
      }
      if (!splitAtEmbeddedBlock && i < lines.length && /^\s*$/.test(lines[i])) i++;
      const cols = /---col---/i.test(colContent)
        ? colContent.split(/\s*---col---\s*/i).map(c => c.trim())
        : colContent.split(/<\/div>\s*<div class="column">/i).map(c =>
            c.replace(/<div class="column">/i, '').replace(/<\/div>/i, '').trim()
          );
      blocks.push({ id: BlockEditor.nextId(), type: 'columns', content: cols.join('\n---col---\n'), meta: { columns: cols } });
      continue;
    }

    // Bulleted list
    if (/^[-*+]\s/.test(line)) {
      let listText = line.replace(/^[-*+]\s/, '');
      i++;
      if (listText.includes('[ ] ') || listText.includes('[x] ')) {
        const checked = listText.startsWith('[x] ');
        blocks.push({ id: BlockEditor.nextId(), type: 'todo-list', content: listText.replace(/^\[[ x]\]\s?/, ''), meta: { checked } });
      } else {
        blocks.push({ id: BlockEditor.nextId(), type: 'bulleted-list', content: listText });
      }
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const listText = line.replace(/^\d+\.\s/, '');
      blocks.push({ id: BlockEditor.nextId(), type: 'numbered-list', content: listText });
      i++; continue;
    }

    // Image (match entire line as image markdown)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      blocks.push({ id: BlockEditor.nextId(), type: 'image', content: imgMatch[1].trim(), meta: { src: imgMatch[2].trim() } });
      i++; continue;
    }

    // Toggle
    if (/^<!-- toggle -->/.test(line) || /^<details>/.test(line)) {
      if (/^<!-- toggle -->/.test(line)) i++;
      if (lines[i] && /^<details>/.test(lines[i])) i++;
      let summary = '', toggleContent = '';
      if (lines[i] && /^<summary>/.test(lines[i])) {
        summary = lines[i].replace(/<\/?summary>/g, '');
        i++;
      }
      while (i < lines.length && !/^<\/details>/.test(lines[i])) {
        toggleContent += (toggleContent ? '\n' : '') + lines[i];
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ id: BlockEditor.nextId(), type: 'toggle-list', content: summary, meta: { children: toggleContent } });
      continue;
    }

    // Table
    if (/^\|.+\|/.test(line) && i + 1 < lines.length && /^\|[-| ]+\|/.test(lines[i + 1])) {
      const headerRow = line;
      i++;
      const sepRow = lines[i]; i++;
      const bodyRows = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        bodyRows.push(lines[i]);
        i++;
      }
      blocks.push({
        id: BlockEditor.nextId(), type: 'table',
        content: headerRow + '\n' + sepRow + '\n' + bodyRows.join('\n')
      });
      continue;
    }

    // Bookmark / Embed
    const linkMatch = line.match(/^\[([^\]]+)\]\(([^)]+)\)\s*$/);
    if (linkMatch) {
      blocks.push(blockFromMarkdownLink(linkMatch[1], linkMatch[2]));
      i++; continue;
    }

    // Default: text/paragraph
    let textContent = line;
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|>\s?|[-*+]\s|\d+\.\s|!\[|---|^\|.+|<!--|^\[.+\]\(.+\)\s*$|\$\$)/.test(lines[i])) {
      textContent += '\n' + lines[i];
      i++;
    }
    blocks.push({ id: BlockEditor.nextId(), type: 'text', content: textContent });
  }

  blocks = detectBareUrls(blocks);

  return blocks;
};

function detectBareUrls(blocks) {
  const urlRegex = /(?:^|\s)(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const result = [];
  for (const block of blocks) {
    if (block.type !== 'text' || !block.content) { result.push(block); continue; }
    const matches = [];
    let m;
    while ((m = urlRegex.exec(block.content)) !== null) {
      matches.push({ url: m[1], index: m.index + m[0].indexOf(m[1]) });
    }
    if (!matches.length) { result.push(block); continue; }
    let last = 0;
    const parts = [];
    for (const match of matches) {
      if (match.index > last) {
        parts.push({ type: 'text', content: block.content.slice(last, match.index).trim() });
      }
      parts.push({ type: 'bookmark', content: match.url.replace(/^https?:\/\//, ''), meta: { url: match.url } });
      last = match.index + match.url.length;
    }
    if (last < block.content.length) {
      const trailing = block.content.slice(last).trim();
      if (trailing) parts.push({ type: 'text', content: trailing });
    }
    for (const part of parts) {
      if (part.type === 'text') {
        result.push({ id: block.id, type: 'text', content: part.content, meta: cloneMeta(block.meta) });
      } else {
        result.push({ id: BlockEditor.nextId(), type: 'bookmark', content: part.content, meta: part.meta });
      }
    }
  }
  return result;
}

// ── Blocks → Markdown Serializer ─────────────────────────────

BlockEditor.serializeMarkdown = function(blocks) {
  const lines = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'divider':
        lines.push('---'); break;
      case 'heading-1':
        lines.push('# ' + b.content); break;
      case 'heading-2':
        lines.push('## ' + b.content); break;
      case 'heading-3':
        lines.push('### ' + b.content); break;
      case 'bulleted-list':
        lines.push('- ' + b.content); break;
      case 'numbered-list':
        lines.push('1. ' + b.content); break;
      case 'todo-list':
        lines.push('- [' + (b.meta?.checked ? 'x' : ' ') + '] ' + b.content); break;
      case 'quote':
        lines.push('> ' + b.content.replace(/\n/g, '\n> ')); break;
      case 'callout':
        lines.push('<!-- callout -->');
        if (b.content) {
          const parts = b.content.split('\n');
          for (const p of parts) lines.push('> ' + p);
        }
        break;
      case 'code':
        lines.push('```' + (b.meta?.language || ''));
        lines.push(b.content);
        lines.push('```');
        break;
      case 'image':
        lines.push('![' + (b.content || '') + '](' + (b.meta?.src || '') + ')');
        break;
      case 'toggle-list':
        lines.push('<!-- toggle -->');
        lines.push('<details>');
        if (b.content) lines.push('<summary>' + b.content + '</summary>');
        if (b.meta?.children) lines.push(b.meta.children);
        lines.push('</details>');
        break;
      case 'table':
        lines.push(b.content); break;
      case 'columns':
        lines.push('<!-- columns -->');
        if (b.content) lines.push(b.content);
        break;
      case 'video':
        lines.push('[' + (b.content || 'Video') + '](' + (b.meta?.src || '') + ')');
        break;
      case 'audio':
        lines.push('[' + (b.content || 'Audio') + '](' + (b.meta?.src || '') + ')');
        break;
      case 'file':
        lines.push('[' + (b.content || 'File') + '](' + (b.meta?.src || '') + ')');
        break;
      case 'bookmark':
        lines.push('[' + (b.content || 'Link') + '](' + (b.meta?.url || '') + ')');
        break;
      case 'page':
        lines.push('[' + b.content + '](page:' + (b.meta?.id || '') + ')');
        break;
      case 'embed':
        lines.push('[Embed](' + (b.meta?.url || '') + ')');
        break;
      case 'equation':
        lines.push('$$');
        lines.push(b.content || '');
        lines.push('$$');
        break;
      case 'mermaid':
        lines.push('```mermaid');
        lines.push(b.content || '');
        lines.push('```');
        break;
      case 'pdf':
        lines.push('[' + (b.content || 'PDF') + '](' + (b.meta?.src || '') + ')');
        break;
      default: // text
        lines.push(b.content); break;
    }
    lines.push(''); // blank line after each block
  }
  return lines.join('\n');
};

// ── Media loading helpers ─────────────────────────────────────

async function loadImageSrc(img, src) {
  if (!src) return;
  if (src.startsWith('data:')) { img.src = src; return; }
  if (src.startsWith('http://') || src.startsWith('https://')) { img.src = src; return; }
  if (window._archivePath && window.mdoAPI?.getArchiveDataUrl) {
    const raw = src.startsWith('file://') ? src.replace('file://', '') : src;
    const paths = [raw, decodeURIComponent(raw), raw.replace(/%20/g, ' '), raw.replace(/ /g, '%20')];
    for (const p of paths) {
      const result = await window.mdoAPI.getArchiveDataUrl(window._archivePath, p);
      if (result.dataUrl) { img.src = result.dataUrl; return; }
    }
  }
  if (window.mdoAPI?.getMediaDataUrl) {
    const resolved = resolvePath(src);
    const result = await window.mdoAPI.getMediaDataUrl(resolved);
    if (result.dataUrl) img.src = result.dataUrl;
    else img.src = resolveFileUrl(src);
  } else {
    img.src = resolveFileUrl(src);
  }
}

async function loadMediaSrc(el, src) {
  if (!src) return;
  if (src.startsWith('data:')) { el.src = src; return; }
  if (src.startsWith('http://') || src.startsWith('https://')) { el.src = src; return; }
  if (window._archivePath && window.mdoAPI?.getArchiveDataUrl) {
    const raw = src.startsWith('file://') ? src.replace('file://', '') : src;
    const paths = [raw, decodeURIComponent(raw), raw.replace(/%20/g, ' '), raw.replace(/ /g, '%20')];
    for (const p of paths) {
      const result = await window.mdoAPI.getArchiveDataUrl(window._archivePath, p);
      if (result.dataUrl) { el.src = result.dataUrl; return; }
    }
  }
  if (window.mdoAPI?.getMediaDataUrl) {
    const resolved = resolvePath(src);
    const result = await window.mdoAPI.getMediaDataUrl(resolved);
    if (result.dataUrl) el.src = result.dataUrl;
    else el.src = resolveFileUrl(src);
  } else {
    el.src = resolveFileUrl(src);
  }
}

async function loadFrameSrc(el, src) {
  if (!src) return;
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
    el.src = src;
    return;
  }
  if (window._archivePath && window.mdoAPI?.getArchiveDataUrl) {
    const raw = src.startsWith('file://') ? src.replace('file://', '') : src;
    const paths = [raw, decodeURIComponent(raw), raw.replace(/%20/g, ' '), raw.replace(/ /g, '%20')];
    for (const p of paths) {
      const result = await window.mdoAPI.getArchiveDataUrl(window._archivePath, p);
      if (result.dataUrl) { el.src = result.dataUrl; return; }
    }
  }
  if (window.mdoAPI?.getMediaDataUrl) {
    const resolved = resolvePath(src);
    const result = await window.mdoAPI.getMediaDataUrl(resolved);
    if (result.dataUrl) el.src = result.dataUrl;
    else el.src = resolveFileUrl(src);
  } else {
    el.src = resolveFileUrl(src);
  }
}

function resolvePath(src) {
  if (src.startsWith('file://')) return src.replace('file://', '');
  if (src.startsWith('/')) return src;
  // Relative path: resolve against the current file's directory
  if (window._currentFileDir) {
    return window._currentFileDir + '/' + src;
  }
  return src;
}

function resolveFileUrl(src) {
  if (src.startsWith('file://')) return src;
  if (src.startsWith('/')) return 'file://' + src;
  return src;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasKatexRenderer() {
  return !!(window.katex && typeof window.katex.renderToString === 'function');
}

function hasMermaidRenderer() {
  return !!(window.mermaid && typeof window.mermaid.render === 'function');
}

function currentMermaidTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
}

function ensureMermaidInitialized() {
  if (!hasMermaidRenderer()) return false;
  const theme = currentMermaidTheme();
  if (window.__mdoMermaidTheme === theme) return true;
  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    suppressErrorRendering: true,
    theme,
  });
  window.__mdoMermaidTheme = theme;
  return true;
}

function renderLatexInlineFallback(source) {
  const commandMap = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ',
    lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', phi: 'φ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Omega: 'Ω',
    pm: '±', times: '×', cdot: '·', div: '÷', leq: '≤', geq: '≥', neq: '≠',
    approx: '≈', infty: '∞', to: '→', rightarrow: '→', leftarrow: '←',
    partial: '∂', nabla: '∇',
  };

  let html = escapeHtml(source)
    .replace(/\\left|\\right/g, '')
    .replace(/\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g, '<span class="latex-op"><span class="latex-upper">$2</span><span class="latex-symbol">Σ</span><span class="latex-lower">$1</span></span>')
    .replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, '<span class="latex-op"><span class="latex-upper">$2</span><span class="latex-symbol">∫</span><span class="latex-lower">$1</span></span>')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="latex-frac"><span class="latex-num">$1</span><span class="latex-den">$2</span></span>')
    .replace(/\\sqrt\{([^{}]+)\}/g, '<span class="latex-root"><span class="latex-radical">√</span><span class="latex-radicand">$1</span></span>')
    .replace(/([A-Za-z0-9)\]}])\^\{([^{}]+)\}/g, '$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]}])_\{([^{}]+)\}/g, '$1<sub>$2</sub>')
    .replace(/([A-Za-z0-9)\]}])\^([A-Za-z0-9+-]+)/g, '$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]}])_([A-Za-z0-9+-]+)/g, '$1<sub>$2</sub>')
    .replace(/\\([A-Za-z]+)/g, (match, command) => commandMap[command] || match)
    .replace(/\n/g, '<br>');

  return html;
}

function renderLatexDisplayFallback(latex) {
  if (!latex) return '<span class="latex-empty">Type LaTeX equation...</span>';
  const matrices = [];
  const withPlaceholders = String(latex).replace(/\\begin\{([bp]?matrix)\}([\s\S]*?)\\end\{\1\}/g, (_, matrixType, body) => {
    const rows = body.split(/\\\\/).map(row => row.trim()).filter(Boolean);
    const table = rows.map(row => {
      const cells = row.split('&').map(cell => '<td>' + renderLatexInlineFallback(cell.trim()) + '</td>').join('');
      return '<tr>' + cells + '</tr>';
    }).join('');
    const bracketClass = matrixType === 'pmatrix' ? ' paren' : matrixType === 'matrix' ? ' plain' : '';
    const html = '<span class="latex-matrix' + bracketClass + '"><table>' + table + '</table></span>';
    const token = '@@MATRIX' + matrices.length + '@@';
    matrices.push({ token, html });
    return token;
  });

  let html = renderLatexInlineFallback(withPlaceholders);
  for (const matrix of matrices) {
    html = html.replace(matrix.token, matrix.html);
  }
  return html;
}

function renderLatexInline(source) {
  if (!source) return '';
  if (!hasKatexRenderer()) return renderLatexInlineFallback(source);
  try {
    return window.katex.renderToString(source, {
      displayMode: false,
      output: 'htmlAndMathml',
      strict: 'ignore',
      throwOnError: false,
    });
  } catch (_) {
    return renderLatexInlineFallback(source);
  }
}

function renderLatexDisplay(latex) {
  if (!latex) return '<span class="latex-empty">Type LaTeX equation...</span>';
  if (!hasKatexRenderer()) return renderLatexDisplayFallback(latex);
  try {
    return window.katex.renderToString(latex, {
      displayMode: true,
      output: 'htmlAndMathml',
      strict: 'ignore',
      throwOnError: false,
    });
  } catch (_) {
    return renderLatexDisplayFallback(latex);
  }
}

function splitInlineMathSegments(text) {
  const segments = [];
  const source = String(text || '');
  let cursor = 0;
  let buffer = '';

  while (cursor < source.length) {
    const ch = source[cursor];
    if (ch === '\\' && cursor + 1 < source.length) {
      buffer += source.slice(cursor, cursor + 2);
      cursor += 2;
      continue;
    }
    if (ch !== '$' || source[cursor + 1] === '$') {
      buffer += ch;
      cursor += 1;
      continue;
    }

    let end = cursor + 1;
    let found = -1;
    while (end < source.length) {
      if (source[end] === '\\' && end + 1 < source.length) {
        end += 2;
        continue;
      }
      if (source[end] === '$') {
        found = end;
        break;
      }
      if (source[end] === '\n') break;
      end += 1;
    }

    if (found === -1) {
      buffer += '$';
      cursor += 1;
      continue;
    }

    const latex = source.slice(cursor + 1, found);
    if (!latex.trim()) {
      buffer += '$$';
      cursor = found + 1;
      continue;
    }

    if (buffer) {
      segments.push({ type: 'text', value: buffer });
      buffer = '';
    }
    segments.push({ type: 'math', value: latex });
    cursor = found + 1;
  }

  if (buffer) {
    segments.push({ type: 'text', value: buffer });
  }
  return segments;
}

function renderTextSegment(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = formatStars(html);
  html = html
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(m, alt, url) {
      var src = url.trim();
      return '<img src="' + src + '" alt="' + alt + '" style="max-height:1.5em;max-width:100%;vertical-align:middle;border-radius:3px;">';
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>');
  return html;
}

function renderInlineMathSegment(latex, editMode) {
  if (editMode) {
    return '<code class="inline-code inline-math-source">$' + escapeHtml(latex) + '$</code>';
  }
  return '<span class="inline-math" data-latex="' + escapeHtml(latex) + '">' + renderLatexInline(latex) + '</span>';
}

let mermaidRenderSequence = 0;

async function renderMermaidPreview(previewEl, source) {
  const diagram = String(source || '').trim();
  previewEl.dataset.renderToken = String((Number(previewEl.dataset.renderToken || '0') || 0) + 1);
  const token = previewEl.dataset.renderToken;

  if (!diagram) {
    previewEl.innerHTML = '<div class="mermaid-empty">Type Mermaid diagram...</div>';
    return;
  }

  if (!ensureMermaidInitialized()) {
    previewEl.innerHTML = '<pre class="mermaid-source">' + escapeHtml(diagram) + '</pre>';
    return;
  }

  previewEl.innerHTML = '<div class="mermaid-rendering">Rendering diagram...</div>';

  try {
    const renderId = 'mdo-mermaid-' + (++mermaidRenderSequence);
    const rendered = await window.mermaid.render(renderId, diagram);
    if (previewEl.dataset.renderToken !== token) return;
    previewEl.innerHTML = rendered.svg;
    if (typeof rendered.bindFunctions === 'function') {
      rendered.bindFunctions(previewEl);
    }
  } catch (error) {
    if (previewEl.dataset.renderToken !== token) return;
    const message = error && error.message ? error.message : String(error);
    previewEl.innerHTML = '<div class="mermaid-error"><strong>Mermaid error</strong><pre>' + escapeHtml(message) + '</pre></div>';
  }
}

// ── Block → DOM Renderer ─────────────────────────────────────

BlockEditor.renderBlock = function(block, isEditable = true) {
  const blockId = block.id || BlockEditor.nextId();
  block = BlockEditor.defaultBlockData(block.type, block.content, block.meta);
  block.id = blockId;
  const el = document.createElement('div');
  el.className = 'block';
  el.dataset.blockId = block.id;
  el.dataset.blockType = block.type;
  BlockEditor.storeBlockData(el, block);

  const handle = document.createElement('div');
  handle.className = 'block-handle';
  handle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="15" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="15" cy="19" r="1.5" fill="currentColor"/></svg>';
  el.appendChild(handle);

  const content = document.createElement('div');
  content.className = 'block-content ' + BlockEditor.contentClassForType(block.type);
  const ed = isEditable;

  switch (block.type) {
    case 'text':
      content.contentEditable = 'true';
      content.dataset.placeholder = 'Type / for commands…';
      content.setAttribute('spellcheck', 'true');
      content.innerHTML = renderInlineContent(block.content, { editMode: ed });
      break;

    case 'heading-1':
    case 'heading-2':
    case 'heading-3':
      content.contentEditable = 'true';
      content.dataset.placeholder = block.type.replace('-', ' ') + '…';
      content.setAttribute('spellcheck', 'true');
      content.innerHTML = renderInlineContent(block.content, { editMode: ed });
      break;

    case 'bulleted-list':
    case 'numbered-list':
    case 'todo-list':
      content.contentEditable = 'true';
      content.dataset.placeholder = 'List item…';
      content.setAttribute('spellcheck', 'true');
      if (block.type === 'todo-list') {
        const cb = document.createElement('span');
        cb.className = 'todo-checkbox' + (block.meta?.checked ? ' checked' : '');
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          block.meta = block.meta || {};
          block.meta.checked = !block.meta.checked;
          cb.classList.toggle('checked');
          content.classList.toggle('checked');
          content.closest('.block-editor')?.dispatchEvent(new CustomEvent('block-changed'));
        });
        content.appendChild(cb);
      }
      content.insertAdjacentHTML('beforeend', renderInlineContent(block.content, { editMode: ed }));
      if (block.type === 'todo-list' && block.meta?.checked) {
        content.classList.add('checked');
      }
      break;

    case 'quote':
      content.contentEditable = 'true';
      content.dataset.placeholder = 'Quote…';
      content.setAttribute('spellcheck', 'true');
      content.innerHTML = renderInlineContent(block.content, { editMode: ed });
      break;

    case 'callout':
      {
        const icon = document.createElement('span');
        icon.className = 'callout-icon';
        icon.textContent = block.meta?.icon || '💡';
        icon.contentEditable = 'false';
        const body = document.createElement('div');
        body.className = 'callout-body';
        body.contentEditable = 'true';
        body.dataset.placeholder = 'Callout content…';
        body.setAttribute('spellcheck', 'true');
        body.innerHTML = renderInlineContent(block.content, { editMode: ed });
        content.appendChild(icon);
        content.appendChild(body);
      }
      break;

    case 'code':
      content.contentEditable = 'true';
      content.setAttribute('spellcheck', 'false');
      content.textContent = block.content;
      if (block.meta?.language) {
        const label = document.createElement('span');
        label.className = 'code-lang-label';
        label.textContent = block.meta.language;
        label.contentEditable = 'false';
        content.appendChild(label);
      }
      break;

    case 'divider':
      content.contentEditable = 'false';
      break;

    case 'image':
      content.contentEditable = 'false';
      if (block.meta?.src) {
        const img = document.createElement('img');
        img.alt = block.content || '';
        img.dataset.src = block.meta.src;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '600px';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.borderRadius = 'var(--radius-md)';
        content.appendChild(img);
        const caption = document.createElement('span');
        caption.className = 'image-caption';
        caption.contentEditable = 'true';
        caption.dataset.placeholder = 'Add a caption…';
        caption.setAttribute('spellcheck', 'true');
        caption.textContent = block.content || '';
        content.appendChild(caption);
        loadImageSrc(img, block.meta.src);
      }
      break;

    case 'table':
      content.contentEditable = 'false';
      if (block.content) {
        const table = document.createElement('table');
        table.className = 'block-table';
        const rows = block.content.split('\n').filter(r => r.trim());
        for (let ri = 0; ri < rows.length; ri++) {
          const tr = document.createElement('tr');
          const cells = splitTableCells(rows[ri]);
          if (ri === 1 && /^[-: ]+$/.test(cells.join(''))) continue;
          for (const cell of cells) {
            const td = document.createElement(ri === 0 ? 'th' : 'td');
            td.textContent = cell.trim();
            td.contentEditable = 'true';
            td.setAttribute('spellcheck', 'true');
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        content.appendChild(table);
      }
      break;

    case 'columns':
      content.contentEditable = 'false';
      {
        const cols = block.meta?.columns || [block.content || 'Column 1', 'Column 2'];
        for (const col of cols) {
          const colDiv = document.createElement('div');
          colDiv.className = 'column-block';
          colDiv.contentEditable = 'true';
          colDiv.dataset.placeholder = 'Column content…';
          colDiv.setAttribute('spellcheck', 'true');
          colDiv.textContent = col;
          content.appendChild(colDiv);
        }
      }
      break;

    case 'toggle-list':
      {
        const arrow = document.createElement('span');
        arrow.className = 'toggle-arrow';
        arrow.textContent = '▶';
        arrow.contentEditable = 'false';
        const toggleContent = document.createElement('div');
        toggleContent.className = 'toggle-content';
        toggleContent.contentEditable = 'true';
        toggleContent.dataset.placeholder = 'Toggle title…';
        toggleContent.setAttribute('spellcheck', 'true');
        toggleContent.textContent = block.content || 'Toggle';
        content.appendChild(arrow);
        content.appendChild(toggleContent);
        if (block.meta?.children) {
          const childDiv = document.createElement('div');
          childDiv.className = 'toggle-children';
          childDiv.textContent = block.meta.children;
          childDiv.contentEditable = 'true';
          content.appendChild(childDiv);
        }
        arrow.addEventListener('click', () => {
          arrow.classList.toggle('open');
          const cd = content.querySelector('.toggle-children');
          if (cd) cd.classList.toggle('open');
        });
      }
      break;

    case 'video':
      content.contentEditable = 'false';
      if (block.meta?.src) {
        const video = document.createElement('video');
        video.controls = true;
        video.dataset.src = block.meta.src;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '480px';
        video.style.borderRadius = 'var(--radius-md)';
        content.appendChild(video);
        loadMediaSrc(video, block.meta.src);
      }
      break;

    case 'audio':
      content.contentEditable = 'false';
      if (block.meta?.src) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.dataset.src = block.meta.src;
        audio.style.width = '100%';
        content.appendChild(audio);
        loadMediaSrc(audio, block.meta.src);
      }
      break;

    case 'file':
      content.contentEditable = 'false';
      {
        const icon = document.createElement('span');
        icon.className = 'file-icon';
        icon.textContent = '📎';
        const info = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = block.content || (block.meta?.src || 'File');
        info.appendChild(name);
        const size = document.createElement('div');
        size.className = 'file-size';
        size.textContent = block.meta?.size || '';
        info.appendChild(size);
        content.appendChild(icon);
        content.appendChild(info);
        content.addEventListener('click', () => {
          if (block.meta?.src) window.mdoAPI?.openInBrowser(asFileUrl(block.meta.src));
        });
      }
      break;

    case 'bookmark':
      content.contentEditable = 'false';
      {
        const thumb = document.createElement('div');
        thumb.className = 'bookmark-thumb';
        const info = document.createElement('div');
        info.className = 'bookmark-info';
        const title = document.createElement('div');
        title.className = 'bookmark-title';
        title.textContent = block.content || 'Bookmark';
        const desc = document.createElement('div');
        desc.className = 'bookmark-desc';
        desc.textContent = block.meta?.description || block.meta?.url || '';
        const urlDiv = document.createElement('div');
        urlDiv.className = 'bookmark-url';
        urlDiv.textContent = block.meta?.url || '';
        info.appendChild(title);
        info.appendChild(desc);
        info.appendChild(urlDiv);
        content.appendChild(thumb);
        content.appendChild(info);
        content.addEventListener('click', () => {
          if (block.meta?.url) window.mdoAPI?.openInBrowser(block.meta.url);
        });
      }
      break;

    case 'embed':
      content.contentEditable = 'false';
      if (block.meta?.url) {
        const iframe = document.createElement('iframe');
        iframe.src = block.meta.url;
        iframe.sandbox = 'allow-scripts allow-same-origin';
        content.appendChild(iframe);
      }
      break;

    case 'equation':
      content.contentEditable = 'false';
      content.dataset.placeholder = 'Type LaTeX equation…';
      content.setAttribute('spellcheck', 'false');
      content.dataset.latex = block.content || '';
      {
        const preview = document.createElement('div');
        preview.className = 'equation-preview';
        preview.innerHTML = renderLatexDisplay(block.content || '');
        content.appendChild(preview);

        if (ed) {
          const source = document.createElement('div');
          source.className = 'equation-source';
          source.contentEditable = 'true';
          source.dataset.placeholder = 'LaTeX, e.g. \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}';
          source.setAttribute('spellcheck', 'false');
          source.textContent = block.content || '';
          source.addEventListener('input', () => {
            content.dataset.latex = source.innerText.trim();
            preview.innerHTML = renderLatexDisplay(content.dataset.latex);
            content.closest('.block-editor')?.dispatchEvent(new CustomEvent('block-changed'));
          });
          content.appendChild(source);
        }
      }
      break;

    case 'mermaid':
      content.contentEditable = 'false';
      content.dataset.placeholder = 'Type Mermaid diagram…';
      content.setAttribute('spellcheck', 'false');
      content.dataset.mermaid = block.content || '';
      {
        const preview = document.createElement('div');
        preview.className = 'mermaid-preview';
        content.appendChild(preview);
        renderMermaidPreview(preview, block.content || '');

        if (ed) {
          const source = document.createElement('div');
          source.className = 'mermaid-source';
          source.contentEditable = 'true';
          source.dataset.placeholder = 'Mermaid source, e.g. graph TD\n  A --> B';
          source.setAttribute('spellcheck', 'false');
          source.textContent = block.content || '';
          source.addEventListener('input', () => {
            content.dataset.mermaid = source.innerText.trim();
            renderMermaidPreview(preview, content.dataset.mermaid);
            content.closest('.block-editor')?.dispatchEvent(new CustomEvent('block-changed'));
          });
          content.appendChild(source);
        }
      }
      break;

    case 'page':
      content.contentEditable = 'false';
      {
        const icon = document.createElement('span');
        icon.className = 'page-icon';
        icon.textContent = '▦';
        icon.setAttribute('aria-hidden', 'true');
        content.appendChild(icon);
        const label = document.createElement('span');
        label.className = 'page-title';
        label.textContent = block.content || 'Untitled Page';
        content.appendChild(label);
        content.dataset.pageId = block.meta?.id || '';
        content.title = block.meta?.id ? 'Page reference: ' + block.meta.id : 'Page reference';
        content.tabIndex = 0;
        content.addEventListener('click', () => {
          content.dispatchEvent(new CustomEvent('page-navigate', {
            bubbles: true,
            detail: {
              id: block.meta?.id || '',
              title: block.content || 'Untitled Page',
            },
          }));
        });
        content.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            content.click();
          }
        });
      }
      break;

    case 'pdf':
      content.contentEditable = 'false';
      if (block.meta?.src) {
        const iframe = document.createElement('iframe');
        iframe.dataset.src = block.meta.src;
        iframe.style.width = '100%';
        iframe.style.minHeight = '500px';
        iframe.style.border = '1px solid var(--border)';
        iframe.style.borderRadius = 'var(--radius-md)';
        content.appendChild(iframe);
        loadFrameSrc(iframe, block.meta.src);
      }
      break;

    default:
      content.contentEditable = 'true';
      content.dataset.placeholder = 'Type / for commands…';
      content.setAttribute('spellcheck', 'true');
      content.textContent = block.content || '';
  }

  // Apply edit mode to editable content
  if (!isEditable) {
    // Make everything read-only
    content.contentEditable = 'false';
    content.querySelectorAll('[contenteditable="true"]').forEach(el => el.contentEditable = 'false');
  } else if (['image', 'video', 'audio', 'file', 'bookmark', 'embed', 'page', 'pdf', 'divider', 'table', 'columns'].includes(block.type)) {
    // Keep the visual container itself read-only while allowing editable children
    // such as image captions, table cells, and column bodies in edit mode.
    content.contentEditable = 'false';
  }

  // Link click handler (Ctrl+click to open in browser)
  content.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (window.mdoAPI?.openInBrowser) window.mdoAPI.openInBrowser(a.href);
      }
    });
  });

  el.appendChild(content);
  return el;
};

// ── Inline Content Rendering ──────────────────────────────────

function formatStars(text) {
  var out = '', i = 0;
  while (i < text.length) {
    if (text.substr(i, 3) === '***') {
      var c = text.indexOf('***', i + 3);
      if (c !== -1) { out += '<strong><em>' + formatStars(text.slice(i + 3, c)) + '</em></strong>'; i = c + 3; continue; }
    }
    if (text.substr(i, 2) === '**') {
      var c = text.indexOf('**', i + 2);
      if (c !== -1) { out += '<strong>' + formatStars(text.slice(i + 2, c)) + '</strong>'; i = c + 2; continue; }
    }
    if (text[i] === '*' && text[i+1] !== '*' && text[i-1] !== '*') {
      var c = text.indexOf('*', i + 1);
      while (c !== -1 && text[c-1] === '*') c = text.indexOf('*', c + 1);
      if (c !== -1 && text[c+1] !== '*') { out += '<em>' + formatStars(text.slice(i + 1, c)) + '</em>'; i = c + 1; continue; }
    }
    out += text[i]; i++;
  }
  return out;
}

function renderInlineContent(text, options = {}) {
  if (!text) return '';
  const segments = splitInlineMathSegments(text);
  if (!segments.length) return renderTextSegment(text);
  return segments.map(segment => {
    if (segment.type === 'math') {
      return renderInlineMathSegment(segment.value, !!options.editMode);
    }
    return renderTextSegment(segment.value);
  }).join('');
}

// ── Extract block content from DOM ────────────────────────────

BlockEditor.readBlock = function(blockEl) {
  const blockId = blockEl.dataset.blockId;
  const type = blockEl.dataset.blockType;
  const contentEl = blockEl.querySelector('.block-content');
  if (!contentEl) return null;

  const stored = storedBlockData(blockEl);
  const block = { id: blockId, type, content: stored.content || '', meta: stored.meta };

  switch (type) {
    case 'text':
    case 'heading-1':
    case 'heading-2':
    case 'heading-3':
    case 'bulleted-list':
    case 'numbered-list':
      block.content = contentEl.contentEditable === 'true'
        ? contentEl.innerText.trim()
        : (stored.content || '');
      break;

    case 'todo-list':
      {
        const cb = contentEl.querySelector('.todo-checkbox');
        block.meta = block.meta || {};
        block.meta.checked = cb?.classList.contains('checked') || false;
        block.content = contentEl.contentEditable === 'true'
          ? contentEl.innerText.trim()
          : (stored.content || '');
      }
      break;

    case 'quote':
      block.content = contentEl.contentEditable === 'true'
        ? contentEl.innerText.trim()
        : (stored.content || '');
      break;

    case 'callout':
      {
        const body = contentEl.querySelector('.callout-body');
        block.content = body && body.contentEditable === 'true'
          ? body.innerText.trim()
          : (stored.content || '');
        const icon = contentEl.querySelector('.callout-icon');
        block.meta = block.meta || {};
        block.meta.icon = icon ? icon.textContent : '💡';
      }
      break;

    case 'code':
      {
        const clone = contentEl.cloneNode(true);
        clone.querySelectorAll('.code-lang-label').forEach(label => label.remove());
        block.content = clone.innerText || clone.textContent || '';
      }
      block.meta = block.meta || {};
      const label = contentEl.querySelector('.code-lang-label');
      block.meta.language = label ? label.textContent : (block.meta.language || '');
      break;

    case 'divider':
      block.content = '---';
      break;

    case 'image':
      {
        const img = contentEl.querySelector('img');
        const caption = contentEl.querySelector('.image-caption');
        block.meta = block.meta || {};
        block.meta.src = img ? (img.dataset.src || block.meta.src || img.getAttribute('src') || '') : (block.meta.src || '');
        block.content = caption ? caption.textContent.trim() : (block.content || '');
      }
      break;

    case 'table':
      {
        const rows = [];
        const table = contentEl.querySelector('table');
        if (table) {
          const trs = table.querySelectorAll('tr');
          for (const tr of trs) {
            const cells = [];
            const tds = tr.querySelectorAll('th, td');
            for (const td of tds) cells.push(escapeTableCell(td.textContent.trim()));
            rows.push('| ' + cells.join(' | ') + ' |');
          }
          if (rows.length > 1) {
            const cols = splitTableCells(rows[0]).filter(function(c) { return true; }).length;
            rows.splice(1, 0, '|' + Array(cols).fill(' --- ').join('|') + '|');
          }
        }
        block.content = rows.join('\n');
      }
      break;

    case 'columns':
      {
        const colDivs = contentEl.querySelectorAll('.column-block');
        const cols = [];
        for (const cd of colDivs) cols.push(cd.textContent.trim());
        block.meta = { columns: cols };
        block.content = cols.join('\n---col---\n');
      }
      break;

    case 'toggle-list':
      {
        const tc = contentEl.querySelector('.toggle-content');
        block.content = tc ? tc.textContent.trim() : '';
        const childDiv = contentEl.querySelector('.toggle-children');
        block.meta = block.meta || {};
        block.meta.children = childDiv ? childDiv.textContent.trim() : '';
      }
      break;

    case 'video':
    case 'audio':
    case 'file':
    case 'embed':
    case 'bookmark':
    case 'pdf':
    case 'page':
      // These are read-only blocks; preserve existing meta/content
      break;

    case 'equation':
      {
        const source = contentEl.querySelector('.equation-source');
        block.content = source
          ? source.innerText.trim()
          : (contentEl.dataset.latex || block.content || '').trim();
      }
      break;

    case 'mermaid':
      {
        const source = contentEl.querySelector('.mermaid-source');
        block.content = source
          ? source.innerText.trim()
          : (contentEl.dataset.mermaid || block.content || '').trim();
      }
      break;

    default:
      block.content = contentEl.textContent.trim();
  }

  return block;
};

// ── Slash Menu ────────────────────────────────────────────────

let slashMenu = null;
let slashTarget = null;
let slashSelected = -1;

BlockEditor.createSlashMenu = function() {
  if (slashMenu) return slashMenu;
  slashMenu = document.createElement('div');
  slashMenu.className = 'slash-menu';
  slashMenu.style.display = 'none';
  document.body.appendChild(slashMenu);
  return slashMenu;
};

BlockEditor.showSlashMenu = function(targetBlockEl, filterText) {
  const menu = BlockEditor.createSlashMenu();
  menu.innerHTML = '';

  const filter = (filterText || '').toLowerCase();
  const categories = { basic: 'Basic', lists: 'Lists', content: 'Content', media: 'Media & Embeds', layout: 'Layout', technical: 'Technical' };

  let items = BlockEditor.TYPES.filter(t =>
    t.label.toLowerCase().includes(filter) || t.id.toLowerCase().includes(filter) ||
    (t.shortcut && t.shortcut.toLowerCase().includes(filter))
  );

  if (items.length === 0) {
    menu.style.display = 'none';
    return;
  }

  slashSelected = -1;
  const grouped = {};
  for (const t of items) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  for (const [cat, types] of Object.entries(grouped)) {
    const group = document.createElement('div');
    group.className = 'slash-menu-group';
    const label = document.createElement('div');
    label.className = 'slash-menu-label';
    label.textContent = categories[cat] || cat;
    group.appendChild(label);

    for (const t of types) {
      const item = document.createElement('div');
      item.className = 'slash-menu-item';
      item.innerHTML = `
        <span class="item-icon">${t.icon}</span>
        <span class="item-label">${t.label}</span>
        ${t.shortcut ? '<span class="item-shortcut">/' + t.shortcut + '</span>' : ''}
      `;
      item.addEventListener('click', async () => {
        BlockEditor.hideSlashMenu();
        await BlockEditor.applyBlockType(targetBlockEl, t.id);
      });
      group.appendChild(item);
    }
    menu.appendChild(group);
  }

  const rect = targetBlockEl.getBoundingClientRect();
  const availHeight = window.innerHeight - rect.bottom - 8;
  menu.style.display = 'block';
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 280) + 'px';
  menu.style.maxHeight = Math.min(Math.max(availHeight, 120), 380) + 'px';
  menu.style.overflowY = 'auto';
  slashTarget = targetBlockEl;
};

BlockEditor.hideSlashMenu = function() {
  if (slashMenu) {
    slashMenu.style.display = 'none';
  }
  slashTarget = null;
  slashSelected = -1;
};

BlockEditor.applyBlockType = async function(blockEl, type) {
  const typeDef = BlockEditor.TYPES.find(t => t.id === type);
  if (!typeDef) return;

  const oldText = blockEl.querySelector('.block-content')?.textContent || '';
  let newContent = oldText.trim().startsWith('/') ? '' : oldText;
  let meta = await BlockEditor.promptForBlockMeta(type, newContent);
  if (meta === null) return;
  if (Object.prototype.hasOwnProperty.call(meta, '_content')) {
    newContent = meta._content;
    delete meta._content;
  }

  blockEl.dataset.blockType = type;
  const contentEl = blockEl.querySelector('.block-content');
  if (contentEl) {
    blockEl.innerHTML = '';
    const handle = document.createElement('div');
    handle.className = 'block-handle';
    handle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="15" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="15" cy="19" r="1.5" fill="currentColor"/></svg>';
    blockEl.appendChild(handle);
    const tempBlock = BlockEditor.defaultBlockData(type, newContent, meta);
    tempBlock.id = blockEl.dataset.blockId;
    BlockEditor.storeBlockData(blockEl, tempBlock);
    const renderedContent = BlockEditor.renderBlock(tempBlock).querySelector('.block-content');
    blockEl.appendChild(renderedContent);
    const focusTarget = renderedContent.contentEditable === 'true'
      ? renderedContent
      : renderedContent.querySelector('[contenteditable="true"]');
    if (focusTarget) focusTarget.focus();
    blockEl.dispatchEvent(new CustomEvent('block-type-applied', {
      bubbles: true,
      detail: { blockId: tempBlock.id, block: tempBlock },
    }));
  }
  blockEl.closest('.block-editor')?.dispatchEvent(new CustomEvent('block-changed', { bubbles: true }));
};

// ── Initialize slash menu keyboard nav ────────────────────────

BlockEditor._slashVisible = function() {
  return !!(slashMenu && slashMenu.style.display !== 'none');
};

document.addEventListener('keydown', (e) => {
  if (!slashMenu || slashMenu.style.display === 'none') return;
  const items = slashMenu.querySelectorAll('.slash-menu-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    slashSelected = Math.min(slashSelected + 1, items.length - 1);
    items.forEach((it, i) => it.classList.toggle('active', i === slashSelected));
    items[slashSelected]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    slashSelected = Math.max(slashSelected - 1, 0);
    items.forEach((it, i) => it.classList.toggle('active', i === slashSelected));
    items[slashSelected]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (slashSelected >= 0 && items[slashSelected]) {
      items[slashSelected].click();
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    BlockEditor.hideSlashMenu();
  }
});

document.addEventListener('click', (e) => {
  if (slashMenu && slashMenu.style.display !== 'none' && !slashMenu.contains(e.target)) {
    BlockEditor.hideSlashMenu();
  }
});

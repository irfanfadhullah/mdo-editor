// ── MDO Viewer — Main Application ─────────────────────────────

if (!window.mdoAPI) throw new Error('mdoAPI not found');

const $ = (sel, ctx = document) => ctx.querySelector(sel);

// ── State ─────────────────────────────────────────────────────

const state = {
  tabs: [],
  activeTabId: null,
  previousTabId: null,
  currentFolder: null,
  _saveTimer: null,
};

// ── Element References ────────────────────────────────────────

const els = {
  sidebarTree: $('#sidebar-tree'),
  sidebarEmpty: $('#sidebar-empty'),
  previewEmpty: $('#preview-empty'),
  blockEditorInner: $('#block-editor-inner'),
  tabsBar: $('#tabs-bar'),
  outlineList: $('#outline-list'),
  outlineEmpty: $('#outline-empty'),
  toolbarPath: $('#toolbar-path'),
  dropOverlay: $('#drop-overlay'),
};

// ── Tab Helpers ───────────────────────────────────────────────

function activeTab() {
  return state.tabs.find(t => t.id === state.activeTabId) || null;
}

function createTab(filePath, blocks) {
  const id = 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const tab = {
    id,
    filePath: filePath || null,
    fileName: filePath ? filePath.split('/').pop() : 'Untitled',
    blocks: blocks || [{ id: BlockEditor.nextId(), type: 'text', content: '', meta: {} }],
    archivePath: null,
    editableFile: filePath || null,
  };
  state.tabs.push(tab);
  return tab;
}

function switchTab(tabId) {
  if (state.activeTabId && state.activeTabId !== tabId) {
    const cur = activeTab();
    if (cur) readAllBlocks();
    state.previousTabId = state.activeTabId;
  }
  state.activeTabId = tabId;
  const tab = activeTab();
  if (!tab) return;
  renderAllBlocks(tab.blocks);
  updateOutline();
  renderTabs();
  els.toolbarPath.textContent = tab.filePath ? tab.filePath.split('/').pop() : tab.fileName;
  updateToolbarButtons(tab.filePath);
  window._archivePath = tab.archivePath;
  if (tab.filePath) {
    window._currentFileDir = tab.filePath.substring(0, tab.filePath.lastIndexOf('/'));
  }
}

function closeTab(tabId) {
  const idx = state.tabs.findIndex(t => t.id === tabId);
  if (idx < 0) return;
  state.tabs.splice(idx, 1);
  if (state.tabs.length === 0) {
    const nt = createTab(null, null);
    state.activeTabId = nt.id;
    state.previousTabId = null;
    switchTab(nt.id);
    return;
  }
  if (state.activeTabId === tabId) {
    const prev = state.previousTabId && state.tabs.find(t => t.id === state.previousTabId);
    const targetId = prev ? prev.id : state.tabs[Math.min(idx, state.tabs.length - 1)].id;
    state.activeTabId = targetId;
    switchTab(targetId);
  }
  renderTabs();
}

function renderTabs() {
  els.tabsBar.innerHTML = '';
  for (const tab of state.tabs) {
    const el = document.createElement('div');
    el.className = 'tab-item' + (tab.id === state.activeTabId ? ' active' : '');
    const icon = (tab.filePath || '').toLowerCase().endsWith('.mdo') ? '📦' : '📝';
    el.innerHTML = `<span class="tab-icon">${icon}</span>${tab.fileName}<span class="tab-close">×</span>`;
    el.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    el.addEventListener('click', () => {
      if (tab.id !== state.activeTabId) switchTab(tab.id);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: 'Close Tab', action: () => closeTab(tab.id) },
      ]);
    });
    els.tabsBar.appendChild(el);
  }
  // Add tab button
  const add = document.createElement('div');
  add.className = 'tab-add';
  add.textContent = '+';
  add.title = 'New Tab';
  add.addEventListener('click', () => {
    const nt = createTab(null, null);
    state.activeTabId = nt.id;
    switchTab(nt.id);
  });
  els.tabsBar.appendChild(add);
}

// ── Blocks Engine ─────────────────────────────────────────────

let editMode = false;

function toggleEditMode() {
  editMode = !editMode;
  const tab = activeTab();
  const editor = $('#block-editor');
  if (editMode) {
    editor.classList.add('editing');
  } else {
    editor.classList.remove('editing');
  }
  if (tab) {
    renderAllBlocks(tab.blocks);
  }
}

function renderAllBlocks(blocks) {
  els.previewEmpty.style.display = 'none';
  els.blockEditorInner.querySelectorAll('.block').forEach(b => b.remove());
  els.blockEditorInner.querySelectorAll('.add-block-row').forEach(b => b.remove());

  if (!blocks || blocks.length === 0) {
    if (editMode) showAddBlockButton(0);
    return;
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockEl = BlockEditor.renderBlock(block, editMode);
    setupBlockListeners(blockEl, i);
    els.blockEditorInner.appendChild(blockEl);
    if (editMode) showAddBlockButton(i + 1);
  }
  updateOutline();
}

function showAddBlockButton(afterIndex) {
  const existing = els.blockEditorInner.querySelector('.add-block-row[data-after="' + afterIndex + '"]');
  if (existing) return;

  const row = document.createElement('div');
  row.className = 'add-block-row';
  row.dataset.after = afterIndex;

  // Text button
  const btn = document.createElement('div');
  btn.className = 'add-block';
  btn.innerHTML = '<span class="add-block-icon">+</span><span class="add-block-text">Add a block</span>';
  btn.addEventListener('click', () => insertNewBlock(afterIndex));
  row.appendChild(btn);

  // Type picker toggle button
  const typeToggle = document.createElement('div');
  typeToggle.className = 'add-block-type-toggle';
  typeToggle.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
  typeToggle.title = 'Choose block type';
  typeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    showBlockTypePicker(row, afterIndex, typeToggle);
  });
  row.appendChild(typeToggle);

  const tab = activeTab();
  const afterEl = afterIndex < (tab?.blocks?.length || 0)
    ? els.blockEditorInner.querySelectorAll('.block')[afterIndex]
    : null;

  if (afterEl) {
    afterEl.after(row);
  } else {
    els.blockEditorInner.appendChild(row);
  }
}

async function insertNewBlock(afterIndex, type = 'text', content = '', options = {}) {
  const tab = activeTab();
  if (!tab) return;
  if (options.readExisting !== false) readAllBlocks();

  const block = await BlockEditor.createBlock(type, content, options);
  if (!block) return;
  tab.blocks.splice(afterIndex, 0, block);
  renderAllBlocks(tab.blocks);
  const blockEl = els.blockEditorInner.querySelectorAll('.block')[afterIndex];
  if (blockEl) focusBlock(blockEl);
}

// ── Block Type Picker (inline, next to "Add a block") ────────

let blockTypePickerEl = null;
let pickerVisible = false;

function getBlockTypePicker() {
  if (blockTypePickerEl) return blockTypePickerEl;
  blockTypePickerEl = document.createElement('div');
  blockTypePickerEl.className = 'block-type-picker';
  blockTypePickerEl.style.display = 'none';
  document.body.appendChild(blockTypePickerEl);
  return blockTypePickerEl;
}

function showBlockTypePicker(rowEl, afterIndex, anchorEl) {
  const picker = getBlockTypePicker();
  picker.innerHTML = '';
  pickerVisible = true;

  const categories = { basic: 'Basic', lists: 'Lists', content: 'Content', media: 'Media & Embeds', layout: 'Layout', technical: 'Technical' };
  const grouped = {};
  for (const t of BlockEditor.TYPES) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  for (const [cat, types] of Object.entries(grouped)) {
    const section = document.createElement('div');
    section.className = 'block-picker-section';
    const label = document.createElement('div');
    label.className = 'block-picker-label';
    label.textContent = categories[cat] || cat;
    section.appendChild(label);

    for (const t of types) {
      const item = document.createElement('div');
      item.className = 'block-picker-item';
      item.innerHTML = `<span class="item-icon">${t.icon}</span><span>${t.label}</span>`;
      item.addEventListener('click', async () => {
        await insertNewBlock(afterIndex, t.id);
        hideBlockTypePicker();
      });
      section.appendChild(item);
    }
    picker.appendChild(section);
  }

  const rect = anchorEl.getBoundingClientRect();
  const availHeight = window.innerHeight - rect.bottom - 8;
  picker.style.display = 'block';
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  picker.style.maxHeight = Math.min(Math.max(availHeight, 120), 380) + 'px';
  picker.style.overflowY = 'auto';
}

function hideBlockTypePicker() {
  if (blockTypePickerEl) {
    blockTypePickerEl.style.display = 'none';
  }
  pickerVisible = false;
}

document.addEventListener('click', (e) => {
  if (blockTypePickerEl && blockTypePickerEl.style.display !== 'none' && !blockTypePickerEl.contains(e.target)) {
    hideBlockTypePicker();
  }
});

els.blockEditorInner.addEventListener('block-type-applied', (e) => {
  e.preventDefault();
  const tab = activeTab();
  if (!tab) return;
  readAllBlocks();
  renderAllBlocks(tab.blocks);
  const blockIndex = tab.blocks.findIndex(b => b.id === e.detail?.blockId);
  const blockEl = els.blockEditorInner.querySelectorAll('.block')[blockIndex];
  if (blockEl) focusBlock(blockEl);
});

function setupBlockListeners(blockEl, index) {
  const contentEl = blockEl.querySelector('.block-content');
  if (!contentEl) return;

  // Click to select
  blockEl.addEventListener('click', (e) => {
    const editable = editableTarget(blockEl);
    if (editable && !e.target.closest('[contenteditable="true"]')) editable.focus();
    document.querySelectorAll('.block.selected').forEach(b => b.classList.remove('selected'));
    blockEl.classList.add('selected');
  });

  // Slash menu
  if (contentEl.contentEditable === 'true') {
    contentEl.addEventListener('input', () => {
      const text = contentEl.textContent || '';
      if (text === '/') {
        BlockEditor.showSlashMenu(blockEl, '');
      } else if (text.startsWith('/')) {
        BlockEditor.showSlashMenu(blockEl, text.slice(1));
      } else {
        BlockEditor.hideSlashMenu();
      }
      blockChanged();
    });
  }

  // Enter/Shift+Enter handling
  if (contentEl.contentEditable === 'true' || contentEl.tagName === 'TEXTAREA') {
    contentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !BlockEditor._slashVisible()) {
        if (e.shiftKey) {
          // Shift+Enter: create new block below
          e.preventDefault();
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const isAtEnd = range.endContainer === contentEl.lastChild &&
              range.endOffset === (contentEl.lastChild?.textContent?.length || 0);
            const empty = !contentEl.textContent || contentEl.textContent.trim() === '';

            if (empty) {
              readAllBlocks();
              const tab2 = activeTab();
              const existing = tab2?.blocks[index] || {};
              if (tab2) {
                tab2.blocks[index] = { id: existing.id || blockEl.dataset.blockId, type: 'text', content: '', meta: {} };
                renderAllBlocks(tab2.blocks);
                const textBlock = els.blockEditorInner.querySelectorAll('.block')[index];
                if (textBlock) focusBlock(textBlock);
              }
              return;
            }

            readAllBlocks();
            const tab2 = activeTab();
            const curBlock = tab2?.blocks[index];
            if (curBlock && !isAtEnd) {
              const cursorOffset = getTextOffset(contentEl, range.endContainer, range.endOffset);
              const beforeText = (contentEl.textContent || '').substring(0, cursorOffset);
              const afterText = (contentEl.textContent || '').substring(cursorOffset);
              curBlock.content = beforeText;
              insertNewBlock(index + 1, curBlock.type, afterText, { readExisting: false });
            } else {
              insertNewBlock(index + 1, 'text');
            }
          } else {
            insertNewBlock(index + 1, 'text');
          }
        } else {
          // Enter (no shift): allow newline inside block - default behavior
          // Only handle empty block: convert heading/list/etc to text
          const empty = !contentEl.textContent || contentEl.textContent.trim() === '';
          if (empty && !['text'].includes(blockEl.dataset.blockType)) {
            e.preventDefault();
            blockEl.dataset.blockType = 'text';
            contentEl.className = 'block-content text';
            contentEl.dataset.placeholder = 'Type / for commands…';
            blockChanged();
            return;
          }
        }
      }

      // Backspace on empty block: delete it
      if (e.key === 'Backspace' && (!contentEl.textContent || contentEl.textContent.trim() === '')) {
        if (state.tabs.length > 1 || (activeTab()?.blocks?.length || 1) > 1) {
          e.preventDefault();
          removeBlock(index);
        }
      }

      // Tab / Shift+Tab: indent/outdent for lists
      if (e.key === 'Tab') {
        if (['bulleted-list', 'numbered-list', 'todo-list'].includes(blockEl.dataset.blockType)) {
          e.preventDefault();
        }
      }
    });
  }

  // Sub-contenteditable elements (callout body, column blocks, etc.)
  const editables = contentEl.querySelectorAll('[contenteditable="true"]');
  for (const ed of editables) {
    ed.addEventListener('input', () => blockChanged());
  }

  // Block-specific change listeners
  const todoCB = contentEl.querySelector('.todo-checkbox');
  if (todoCB) {
    // Already handled in renderBlock
  }
}

function removeBlock(index) {
  const tab = activeTab();
  if (!tab || tab.blocks.length <= 1) return;
  tab.blocks.splice(index, 1);
  const blockEls = els.blockEditorInner.querySelectorAll('.block');
  if (blockEls[index]) blockEls[index].remove();
  const prevBlock = blockEls[index - 1];
  if (prevBlock) focusBlock(prevBlock);
  reindex();
  updateOutline();
}

function focusBlock(blockEl) {
  const content = editableTarget(blockEl);
  if (content) {
    content.focus();
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function editableTarget(blockEl) {
  const content = blockEl?.querySelector('.block-content');
  if (!content) return null;
  if (content.contentEditable === 'true') return content;
  return content.querySelector('[contenteditable="true"]');
}

BlockEditor._slashVisible = function() {
  const menu = document.querySelector('.slash-menu');
  return menu && menu.style.display !== 'none';
};

function reindex() {
  const blockEls = els.blockEditorInner.querySelectorAll('.block');
  blockEls.forEach((el, i) => {
    setupBlockListeners(el, i);
  });
}

function blockChanged() {
  clearTimeout(state._saveTimer);
  state._saveTimer = setTimeout(() => {
    readAllBlocks();
    updateOutline();
  }, 300);
}

function readAllBlocks() {
  const tab = activeTab();
  if (!tab) return;
  const blockEls = els.blockEditorInner.querySelectorAll('.block');
  tab.blocks = [];
  for (const el of blockEls) {
    const block = BlockEditor.readBlock(el);
    if (block) tab.blocks.push(block);
  }
}

function handlePageNavigate(e) {
  const targetId = e.detail?.id || '';
  const sourceBlock = e.target.closest('.block');
  const targetBlock = [...els.blockEditorInner.querySelectorAll('.block')]
    .find(block => block !== sourceBlock && block.dataset.blockId === targetId);

  if (targetBlock) {
    targetBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusBlock(targetBlock);
    return;
  }

  const pageEl = e.target.closest('.page-block');
  if (pageEl) {
    pageEl.classList.add('page-missing');
    clearTimeout(pageEl._pageMissingTimer);
    pageEl._pageMissingTimer = setTimeout(() => pageEl.classList.remove('page-missing'), 900);
  }
}

els.blockEditorInner.addEventListener('page-navigate', handlePageNavigate);

// ── Outline (Headings) ────────────────────────────────────────

function updateOutline() {
  const tab = activeTab();
  const blocks = tab ? tab.blocks : [];
  const headings = blocks.filter(b => ['heading-1', 'heading-2', 'heading-3'].includes(b.type));
  const outlineList = els.outlineList;
  const outlineEmpty = els.outlineEmpty;

  if (headings.length === 0) {
    outlineList.innerHTML = '';
    outlineList.appendChild(outlineEmpty);
    outlineEmpty.style.display = '';
    return;
  }

  outlineEmpty.style.display = 'none';
  outlineList.innerHTML = '';

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const blockIndex = blocks.indexOf(h);
    const item = document.createElement('div');
    item.className = 'outline-item ' + h.type;
    item.textContent = stripMarkdown(h.content) || '(empty)';
    item.addEventListener('click', () => {
      const blockEl = els.blockEditorInner.querySelectorAll('.block')[blockIndex];
      if (blockEl) {
        blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        focusBlock(blockEl);
      }
    });
    outlineList.appendChild(item);
  }
}

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\$\$?(.+?)\$\$?/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .trim();
}

// ── Toolbar ───────────────────────────────────────────────────

$('#btn-new').addEventListener('click', newDocument);
$('#btn-open').addEventListener('click', async () => {
  const paths = await window.mdoAPI.openFile();
  for (const p of paths) openFile(p);
});
$('#btn-folder').addEventListener('click', async () => {
  const folder = await window.mdoAPI.openFolder();
  if (folder) navigateFolder(folder);
});
$('#btn-extract').addEventListener('click', extractArchive);
$('#btn-edit-toggle').addEventListener('click', () => {
  toggleEditMode();
  const btn = $('#btn-edit-toggle');
  if (btn) btn.textContent = editMode ? '👁 View' : '✏ Edit';
});
$('#btn-refresh').addEventListener('click', () => {
  if (state.currentFolder) navigateFolder(state.currentFolder);
});

function newDocument() {
  const tab = createTab(null, [{ id: BlockEditor.nextId(), type: 'text', content: '', meta: {} }]);
  window._archivePath = null;
  state.activeTabId = tab.id;
  switchTab(tab.id);
}

// ── File Opening ──────────────────────────────────────────────

function showError(msg) {
  console.error('[mdo-viewer]', msg);
  $('#block-editor-inner').innerHTML = `<div style="padding:40px;color:var(--text-secondary);text-align:center;">Error: ${msg}</div>`;
  els.previewEmpty.style.display = 'none';
}

async function openFile(filePath) {
  filePath = filePath.replace(/\\/g, '/');
  console.log('[mdo-viewer] openFile:', filePath);
  const ext = filePath.split('.').pop()?.toLowerCase();

  if (ext === 'mdo') { await openArchive(filePath); return; }
  if (['md', 'markdown', 'mdown'].includes(ext)) { await openMarkdown(filePath); return; }
  await openPreviewFile(filePath);
}

async function openArchive(filePath) {
  const tab = createTab(filePath, null);
  if (!state.activeTabId && tab) state.activeTabId = tab.id;
  tab.filePath = filePath;
  tab.fileName = filePath.split('/').pop();
  tab.archivePath = filePath;
  tab.editableFile = null;
  window._archivePath = filePath;
  const entries = await window.mdoAPI.listArchive(filePath);
  if (entries.error) {
    const fallback = await window.mdoAPI.readFile(filePath);
    if (typeof fallback === 'string' && fallback.trim() && !fallback.includes('\u0000')) {
      console.warn('[mdo-viewer] Recovered plain Markdown from invalid .mdo archive:', filePath);
      tab.archivePath = null;
      tab.editableFile = filePath;
      window._archivePath = null;
      state.activeTabId = tab.id;
      loadMarkdownContent(fallback);
      switchTab(tab.id);
      els.toolbarPath.textContent = tab.fileName + ' (recovered)';
      updateToolbarButtons(filePath);
      return;
    }
    showError('Cannot open archive: ' + entries.error);
    return;
  }
  state.activeTabId = tab.id;
  switchTab(tab.id);
  els.toolbarPath.textContent = tab.fileName;
  updateToolbarButtons(filePath);

  // Build sidebar archive tree
  els.sidebarEmpty.style.display = 'none';
  els.sidebarTree.style.display = 'block';
  els.sidebarTree.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'tree-item expanded';
  root.style.paddingLeft = '8px';
  root.innerHTML = '<span class="tree-arrow">▶</span><span class="tree-icon">📦</span><span class="tree-name">' + filePath.split('/').pop() + '</span>';
  root.addEventListener('click', (e) => {
    e.stopPropagation();
    root.classList.toggle('expanded');
    const ch = root.nextElementSibling;
    if (ch) ch.style.display = ch.style.display === 'none' ? '' : 'none';
  });
  els.sidebarTree.appendChild(root);
  const wrapper = document.createElement('div');
  wrapper.className = 'tree-children';
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.style.paddingLeft = '24px';
    item.innerHTML = `<span style="width:14px;"></span><span class="tree-icon">${fileIcon(entry.name, false)}</span><span class="tree-name">${entry.name}</span>`;
    item.addEventListener('click', (e) => { e.stopPropagation(); openArchiveEntry(filePath, entry.name); });
    wrapper.appendChild(item);
  }
  root.after(wrapper);

  const docEntry = entries.find(e => e.name === 'document.md');
  if (docEntry) await openArchiveEntry(filePath, 'document.md');
}

async function openArchiveEntry(zipPath, entryName) {
  const tab = activeTab();
  if (!tab) return;
  const content = await window.mdoAPI.readArchive(zipPath, entryName);
  if (content.error) { showError('Cannot read: ' + content.error); return; }
  tab.archivePath = zipPath;
  window._archivePath = zipPath;
  loadMarkdownContent(content);
  els.toolbarPath.textContent = zipPath.split('/').pop() + ' / ' + entryName;
  updateToolbarButtons(zipPath);
}

async function openMarkdown(filePath) {
  const content = await window.mdoAPI.readFile(filePath);
  if (content.error) { showError('Cannot read: ' + content.error); return; }
  const tab = createTab(filePath, null);
  tab.filePath = filePath;
  tab.fileName = filePath.split('/').pop();
  tab.editableFile = filePath;
  tab.archivePath = null;
  window._archivePath = null;
  window._currentFileDir = filePath.substring(0, filePath.lastIndexOf('/'));
  state.activeTabId = tab.id;
  loadMarkdownContent(content);
  switchTab(tab.id);
  els.toolbarPath.textContent = tab.fileName;
  updateToolbarButtons(filePath);
}

function loadMarkdownContent(markdown) {
  const tab = activeTab();
  if (!tab) return;
  tab.blocks = BlockEditor.parseMarkdown(markdown);
  if (tab.blocks.length === 0) {
    tab.blocks = [{ id: BlockEditor.nextId(), type: 'text', content: '', meta: {} }];
  }
  renderAllBlocks(tab.blocks);
}

async function openPreviewFile(filePath) {
  const tab = createTab(filePath, null);
  tab.filePath = filePath;
  tab.fileName = filePath.split('/').pop();
  tab.editableFile = null;
  window._archivePath = null;
  state.activeTabId = tab.id;
  switchTab(tab.id);
  els.toolbarPath.textContent = tab.fileName;
  updateToolbarButtons(filePath);
  const ext = filePath.split('.').pop()?.toLowerCase();

  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
    const data = await window.mdoAPI.readFile(filePath, 'base64');
    tab.blocks = [{ id: BlockEditor.nextId(), type: 'image', content: '', meta: { src: 'data:image/' + ext + ';base64,' + data } }];
  } else {
    const content = await window.mdoAPI.readFile(filePath);
    if (content.error) { showError(content.error); return; }
    tab.blocks = [{ id: BlockEditor.nextId(), type: 'text', content: (content || '').substring(0, 5000), meta: {} }];
  }
  renderAllBlocks(tab.blocks);
}

// ── Save ──────────────────────────────────────────────────────

async function saveCurrentFile() {
  const tab = activeTab();
  if (!tab) return;
  readAllBlocks();
  let savePath = tab.editableFile || tab.filePath;

  if (!savePath) {
    savePath = await window.mdoAPI.saveFile({
      title: 'Save Document',
      defaultPath: state.currentFolder ? state.currentFolder + '/untitled.md' : 'untitled.md',
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'MDO Archive', extensions: ['mdo'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (!savePath) return;
    tab.editableFile = savePath;
  }

  const isMdo = /\.mdo$/i.test(savePath);
  const result = isMdo
    ? await window.mdoAPI.writeMdoArchive(savePath, BlockEditor.createMdoArchivePayload(tab.blocks, {
        title: tab.fileName || savePath.split('/').pop().replace(/\.mdo$/i, ''),
        archivePath: tab.archivePath || (tab.filePath && /\.mdo$/i.test(tab.filePath) ? tab.filePath : null),
      }))
    : await window.mdoAPI.writeFile(savePath, BlockEditor.serializeMarkdown(tab.blocks));
  if (result.error) { showError('Save failed: ' + result.error); return; }

  tab.filePath = savePath;
  tab.fileName = savePath.split('/').pop();
  tab.archivePath = isMdo ? savePath : null;
  window._archivePath = tab.archivePath;
  els.toolbarPath.textContent = tab.fileName;
  updateToolbarButtons(savePath);
  renderTabs();
  const parent = savePath.substring(0, savePath.lastIndexOf('/'));
  if (parent && parent !== state.currentFolder) navigateFolder(parent);
}

async function extractArchive() {
  const tab = activeTab();
  if (!tab || !tab.archivePath) return;
  const dest = await window.mdoAPI.selectFolder();
  if (!dest) return;
  const name = tab.archivePath.split('/').pop().replace(/\.mdo$/i, '');
  const outDir = dest + '/' + name;
  const entries = await window.mdoAPI.listArchive(tab.archivePath);
  if (entries.error) { showError(entries.error); return; }
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const content = await window.mdoAPI.readArchive(tab.archivePath, entry.name, 'base64');
    if (!content.error) {
      const fullPath = outDir + '/' + entry.name;
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      try { await window.mdoAPI.writeFile(fullPath, atob(content)); } catch (_) {}
    }
  }
  showError('Extracted to ' + outDir);
}

// ── Toolbar State ─────────────────────────────────────────────

function updateToolbarButtons(filePath) {
  const isMdo = filePath && filePath.toLowerCase().endsWith('.mdo');
  const extractBtn = $('#btn-extract');
  if (extractBtn) extractBtn.classList.toggle('disabled', !isMdo);
}

// ── Keyboard Shortcuts ────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentFile();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
    e.preventDefault();
    $('#btn-open').click();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    newDocument();
  }
});

// ── Sidebar: File Explorer ────────────────────────────────────

function fileIcon(name, isDir) {
  if (isDir) return '📁';
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'mdo') return '📦';
  if (['md', 'markdown', 'mdown'].includes(ext)) return '📝';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'tiff'].includes(ext)) return '🖼';
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📋';
  if (['js', 'ts', 'py', 'swift', 'rs', 'go', 'java', 'c', 'cpp', 'sh'].includes(ext)) return '⌨';
  return '📄';
}

function treeSort(a, b) {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

async function navigateFolder(folderPath) {
  state.currentFolder = folderPath;
  els.sidebarEmpty.style.display = 'none';
  els.sidebarTree.style.display = 'block';
  const entries = await window.mdoAPI.readDir(folderPath);
  if (entries.error) {
    els.sidebarTree.innerHTML = '<div style="padding:12px;color:var(--text-tertiary);font-size:var(--font-size-xs);">' + entries.error + '</div>';
    return;
  }
  els.sidebarTree.innerHTML = '';
  for (const entry of entries.sort(treeSort)) {
    els.sidebarTree.appendChild(createTreeItem(entry, folderPath, 0));
  }
}

function createTreeItem(entry, basePath, depth) {
  const el = document.createElement('div');
  el.className = 'tree-item';
  el.style.paddingLeft = (8 + depth * 16) + 'px';
  el.dataset.path = entry.path;

  if (entry.isDirectory) {
    el.innerHTML = '<span class="tree-arrow">▶</span><span class="tree-icon">📁</span><span class="tree-name">' + entry.name + '</span>';
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      el.classList.toggle('expanded');
      const children = el.nextElementSibling;
      if (children && children.classList.contains('tree-children')) {
        children.style.display = children.style.display === 'none' ? '' : 'none';
        return;
      }
      const childEntries = await window.mdoAPI.readDir(entry.path);
      if (childEntries.error) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'tree-children';
      for (const child of childEntries.sort(treeSort)) {
        wrapper.appendChild(createTreeItem(child, entry.path, depth + 1));
      }
      el.after(wrapper);
    });
  } else {
    el.innerHTML = '<span style="width:14px;flex-shrink:0;"></span><span class="tree-icon">' + fileIcon(entry.name, false) + '</span><span class="tree-name">' + entry.name + '</span>';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openFile(entry.path);
    });
  }
  return el;
}

// ── Drop Handling ─────────────────────────────────────────────

document.addEventListener('dragover', (e) => { e.preventDefault(); els.dropOverlay.classList.add('visible'); });
document.addEventListener('dragleave', (e) => { if (e.target === els.dropOverlay) els.dropOverlay.classList.remove('visible'); });
document.addEventListener('drop', (e) => {
  e.preventDefault();
  els.dropOverlay.classList.remove('visible');
  for (const f of e.dataTransfer.files) openFile(f.path);
});

// ── Resize Panels ─────────────────────────────────────────────

function initResizers() {
  const sidebar = $('#sidebar');
  const outline = $('#outline');
  let resizing = false, startX, startW;

  sidebar.addEventListener('mousedown', (e) => {
    const rect = sidebar.getBoundingClientRect();
    if (e.clientX > rect.right - 4) {
      resizing = true; startX = e.clientX; startW = sidebar.offsetWidth;
      document.body.style.cursor = 'col-resize';
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    sidebar.style.width = Math.max(180, Math.min(500, startW + e.clientX - startX)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (resizing) { resizing = false; document.body.style.cursor = ''; }
  });

  let outResizing = false, outStartX, outStartW;
  outline.addEventListener('mousedown', (e) => {
    const rect = outline.getBoundingClientRect();
    if (e.clientX < rect.left + 4) {
      outResizing = true; outStartX = e.clientX; outStartW = outline.offsetWidth;
      document.body.style.cursor = 'col-resize';
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (!outResizing) return;
    outline.style.width = Math.max(160, Math.min(400, outStartW + outStartX - e.clientX)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (outResizing) { outResizing = false; document.body.style.cursor = ''; }
  });
}

// ── Menu Events ───────────────────────────────────────────────

window.mdoAPI.onMenuNew(() => newDocument());
window.mdoAPI.onMenuOpen(() => $('#btn-open').click());
window.mdoAPI.onMenuSave(() => saveCurrentFile());

// ── Right-click Context Menu ──────────────────────────────────

let contextMenu = null;

function createContextMenu() {
  if (contextMenu) return contextMenu;
  contextMenu = document.createElement('div');
  contextMenu.className = 'slash-menu';
  contextMenu.style.display = 'none';
  contextMenu.style.minWidth = '180px';
  document.body.appendChild(contextMenu);
  return contextMenu;
}

function showContextMenu(x, y, items) {
  const menu = createContextMenu();
  menu.innerHTML = '';
  for (const item of items) {
    if (item === '-') { const sep = document.createElement('div'); sep.style.borderTop = '0.5px solid var(--border)'; sep.style.margin = '2px 8px'; menu.appendChild(sep); continue; }
    const el = document.createElement('div');
    el.className = 'slash-menu-item';
    el.textContent = item.label;
    el.addEventListener('click', () => { item.action(); hideContextMenu(); });
    menu.appendChild(el);
  }
  menu.style.display = 'block';
  menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
  menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
}

function hideContextMenu() {
  if (contextMenu) contextMenu.style.display = 'none';
}

document.addEventListener('click', (e) => {
  if (contextMenu && contextMenu.style.display !== 'none' && !contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

// Context menu on block editor
els.blockEditorInner.parentElement?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const sel = window.getSelection();
  const selectedText = sel?.toString().trim();
  const linkEl = e.target.closest('a');

  const items = [];
  if (selectedText) {
    items.push({ label: 'Copy', action: () => navigator.clipboard.writeText(selectedText) });
  }
  if (linkEl) {
    items.push({ label: 'Copy Link', action: () => navigator.clipboard.writeText(linkEl.href) });
    items.push({ label: 'Open Link', action: () => window.mdoAPI?.openInBrowser(linkEl.href) });
  }
  if (editMode) {
    if (items.length > 0) items.push('-');
    items.push({ label: 'Paste', action: async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          const tab = activeTab();
          if (tab) {
            tab.blocks.push({ id: BlockEditor.nextId(), type: 'text', content: text, meta: {} });
            renderAllBlocks(tab.blocks);
          }
        }
      } catch (_) {}
    }});
  }
  if (items.length > 0) showContextMenu(e.clientX, e.clientY, items);
});

// ── IPC Events ────────────────────────────────────────────────

window.mdoAPI.onOpenFile((filePath) => {
  openFile(filePath);
  const parent = filePath.substring(0, filePath.lastIndexOf('/'));
  if (parent && parent !== state.currentFolder) navigateFolder(parent);
});

// ── Init ──────────────────────────────────────────────────────

function init() {
  initResizers();
  newDocument();
}

init();

// ── MDO Viewer — Full-screen Block Editor ─────────────────────

if (!window.mdoAPI) { throw new Error('mdoAPI not found'); }

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── State ─────────────────────────────────────────────────────

const state = {
  filePath: null,
  title: '',
  blocks: [],
};

// ── Element References ────────────────────────────────────────

const els = {
  title: $('#editor-title'),
  blockEditorInner: $('#block-editor-inner'),
  blockPicker: $('#block-picker'),
};

// ── Blocks Engine ─────────────────────────────────────────────

function renderAllBlocks(blocks) {
  els.blockEditorInner.querySelectorAll('.block').forEach(b => b.remove());
  els.blockEditorInner.querySelectorAll('.add-block-row').forEach(b => b.remove());

  if (!blocks || blocks.length === 0) {
    state.blocks = [{ id: BlockEditor.nextId(), type: 'text', content: '', meta: {} }];
    renderAllBlocks(state.blocks);
    return;
  }

  for (let i = 0; i < blocks.length; i++) {
    const blockEl = BlockEditor.renderBlock(blocks[i]);
    setupBlockListeners(blockEl, i);
    els.blockEditorInner.appendChild(blockEl);
    showAddButton(i + 1);
  }
}

function showAddButton(afterIndex) {
  const existing = els.blockEditorInner.querySelector('.add-block-row[data-after="' + afterIndex + '"]');
  if (existing) return;
  const row = document.createElement('div');
  row.className = 'add-block-row';
  row.dataset.after = afterIndex;
  const btn = document.createElement('div');
  btn.className = 'add-block';
  btn.innerHTML = '<span class="add-block-icon">+</span><span class="add-block-text">Add a block</span>';
  btn.addEventListener('click', async () => { await insertBlock(afterIndex); });
  row.appendChild(btn);
  const typeToggle = document.createElement('div');
  typeToggle.className = 'add-block-type-toggle';
  typeToggle.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
  typeToggle.title = 'Choose block type';
  typeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    showBlockTypePicker(afterIndex, typeToggle);
  });
  row.appendChild(typeToggle);
  const afterEl = afterIndex < state.blocks.length
    ? els.blockEditorInner.querySelectorAll('.block')[afterIndex] : null;
  if (afterEl) afterEl.after(row);
  else els.blockEditorInner.appendChild(row);
}

async function insertBlock(afterIndex, type = 'text', content = '', options = {}) {
  if (options.readExisting !== false) readAllBlocks();

  const block = await BlockEditor.createBlock(type, content, options);
  if (!block) return;
  state.blocks.splice(afterIndex, 0, block);
  renderAllBlocks(state.blocks);
  const blockEl = els.blockEditorInner.querySelectorAll('.block')[afterIndex];
  if (blockEl) focusBlock(blockEl);
}

// ── Inline Block Type Picker ─────────────────────────────────

let blockTypePickerEl = null;

function getBlockTypePicker() {
  if (blockTypePickerEl) return blockTypePickerEl;
  blockTypePickerEl = document.createElement('div');
  blockTypePickerEl.className = 'block-type-picker';
  blockTypePickerEl.style.display = 'none';
  document.body.appendChild(blockTypePickerEl);
  return blockTypePickerEl;
}

function showBlockTypePicker(afterIndex, anchorEl) {
  const picker = getBlockTypePicker();
  picker.innerHTML = '';
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
        await insertBlock(afterIndex, t.id);
        hideBlockTypePicker();
      });
      section.appendChild(item);
    }
    picker.appendChild(section);
  }

  const rect = anchorEl.getBoundingClientRect();
  picker.style.display = 'block';
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
}

function hideBlockTypePicker() {
  if (blockTypePickerEl) blockTypePickerEl.style.display = 'none';
}

document.addEventListener('click', (e) => {
  if (blockTypePickerEl && blockTypePickerEl.style.display !== 'none' && !blockTypePickerEl.contains(e.target)) {
    hideBlockTypePicker();
  }
});

function setupBlockListeners(blockEl, index) {
  const contentEl = blockEl.querySelector('.block-content');
  if (!contentEl) return;

  blockEl.addEventListener('click', () => {
    document.querySelectorAll('.block.selected').forEach(b => b.classList.remove('selected'));
    blockEl.classList.add('selected');
    const editable = editableTarget(blockEl);
    if (editable) editable.focus();
  });

  if (contentEl.contentEditable === 'true') {
    contentEl.addEventListener('input', () => {
      const text = contentEl.textContent || '';
      if (text === '/') BlockEditor.showSlashMenu(blockEl, '');
      else if (text.startsWith('/')) BlockEditor.showSlashMenu(blockEl, text.slice(1));
      else BlockEditor.hideSlashMenu();
      blockChanged();
    });

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
            const empty = !contentEl.textContent?.trim();

            if (empty) {
              readAllBlocks();
              const existing = state.blocks[index] || {};
              state.blocks[index] = { id: existing.id || blockEl.dataset.blockId, type: 'text', content: '', meta: {} };
              renderAllBlocks(state.blocks);
              const textBlock = els.blockEditorInner.querySelectorAll('.block')[index];
              if (textBlock) focusBlock(textBlock);
              return;
            }

            readAllBlocks();
            const curBlock = state.blocks[index];
            if (curBlock && !isAtEnd) {
              const cursorOffset = getTextOffset(contentEl, range.endContainer, range.endOffset);
              const beforeText = (contentEl.textContent || '').substring(0, cursorOffset);
              const afterText = (contentEl.textContent || '').substring(cursorOffset);
              curBlock.content = beforeText;
              insertBlock(index + 1, curBlock.type, afterText, { readExisting: false });
            } else {
              insertBlock(index + 1, 'text');
            }
          } else {
            insertBlock(index + 1, 'text');
          }
        } else {
          // Enter (no shift): allow newline inside block
          const empty = !contentEl.textContent?.trim();
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
      if (e.key === 'Backspace' && (!contentEl.textContent?.trim()) && state.blocks.length > 1) {
        e.preventDefault();
        state.blocks.splice(index, 1);
        renderAllBlocks(state.blocks);
      }
    });
  }

  contentEl.querySelectorAll('[contenteditable="true"]').forEach(ed => {
    ed.addEventListener('input', () => blockChanged());
  });

  const todoCB = contentEl.querySelector('.todo-checkbox');
  if (todoCB) {
    todoCB.addEventListener('click', (e) => {
      e.stopPropagation();
      blockEl.closest('.block-editor')?.dispatchEvent(new CustomEvent('block-changed'));
    });
  }
}

function focusBlock(blockEl) {
  const content = editableTarget(blockEl);
  if (content) {
    content.focus();
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }
}

function editableTarget(blockEl) {
  const content = blockEl?.querySelector('.block-content');
  if (!content) return null;
  if (content.contentEditable === 'true') return content;
  return content.querySelector('[contenteditable="true"]');
}

els.blockEditorInner.addEventListener('block-type-applied', (e) => {
  e.preventDefault();
  readAllBlocks();
  renderAllBlocks(state.blocks);
  const blockIndex = state.blocks.findIndex(b => b.id === e.detail?.blockId);
  const blockEl = els.blockEditorInner.querySelectorAll('.block')[blockIndex];
  if (blockEl) focusBlock(blockEl);
});

function blockChanged() {
  clearTimeout(state._saveTimer);
  state._saveTimer = setTimeout(() => readAllBlocks(), 300);
}

function readAllBlocks() {
  const blockEls = els.blockEditorInner.querySelectorAll('.block');
  state.blocks = [];
  for (const el of blockEls) {
    const block = BlockEditor.readBlock(el);
    if (block) state.blocks.push(block);
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

// ── Block Picker ──────────────────────────────────────────────

let pickerOpen = false;
$('#btn-block-picker').addEventListener('click', (e) => {
  e.stopPropagation();
  if (pickerOpen) { els.blockPicker.style.display = 'none'; pickerOpen = false; return; }
  const rect = e.currentTarget.getBoundingClientRect();
  els.blockPicker.style.display = 'block';
  els.blockPicker.style.top = (rect.bottom + 6) + 'px';
  els.blockPicker.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  pickerOpen = true;
});

document.addEventListener('click', (e) => {
  if (pickerOpen && !els.blockPicker.contains(e.target) && e.target !== $('#btn-block-picker')) {
    els.blockPicker.style.display = 'none';
    pickerOpen = false;
  }
});

$$('.block-picker-item', els.blockPicker).forEach(item => {
  item.addEventListener('click', async () => {
    await insertBlock(state.blocks.length, item.dataset.block);
    els.blockPicker.style.display = 'none';
    pickerOpen = false;
  });
});

// ── Title ─────────────────────────────────────────────────────

$('#editor-title').addEventListener('input', () => {
  state.title = $('#editor-title').value;
});

// ── Attach ────────────────────────────────────────────────────

$('#btn-attach').addEventListener('click', async () => {
  const paths = await window.mdoAPI.openFile();
  if (!paths || !paths.length) return;
  readAllBlocks();
  for (const p of paths) {
    const name = p.split('/').pop();
    const isImage = /\.(png|jpg|jpeg|webp|gif|svg|bmp)$/i.test(name);
    if (isImage) {
      state.blocks.push({ id: BlockEditor.nextId(), type: 'image', content: name, meta: { src: 'file://' + p } });
    } else {
      state.blocks.push({ id: BlockEditor.nextId(), type: 'file', content: name, meta: { src: 'file://' + p } });
    }
  }
  renderAllBlocks(state.blocks);
});

// ── Save ──────────────────────────────────────────────────────

async function saveDocument() {
  readAllBlocks();
  let savePath = state.filePath;

  if (!savePath) {
    const defaultName = (state.title || 'untitled').replace(/[\\/:*?"<>|]/g, '') + '.md';
    savePath = await window.mdoAPI.saveFile({
      title: 'Save Document',
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'MDO Archive', extensions: ['mdo'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (!savePath) return;
    state.filePath = savePath;
  }

  const isMdo = /\.mdo$/i.test(savePath);
  const result = isMdo
    ? await window.mdoAPI.writeMdoArchive(savePath, BlockEditor.createMdoArchivePayload(state.blocks, {
        title: state.title || savePath.split('/').pop().replace(/\.mdo$/i, ''),
        archivePath: state.filePath && /\.mdo$/i.test(state.filePath) ? state.filePath : null,
      }))
    : await window.mdoAPI.writeFile(savePath, BlockEditor.serializeMarkdown(state.blocks));
  if (result.error) { console.error('Save failed:', result.error); return; }
  state.filePath = savePath;
  window._archivePath = isMdo ? savePath : null;
  if (state.title) $('#editor-title').value = savePath.split('/').pop().replace(/\.[^.]+$/, '');
  state.title = $('#editor-title').value;
}

$('#btn-save').addEventListener('click', saveDocument);
$('#btn-save-as').addEventListener('click', async () => {
  state.filePath = null;
  await saveDocument();
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    saveDocument();
  }
});

// ── IPC ───────────────────────────────────────────────────────

window.mdoAPI.onEditFile((filePath) => {
  loadFile(filePath);
});

async function loadFile(filePath) {
  const content = await window.mdoAPI.readFile(filePath);
  if (content.error) return;
  state.filePath = filePath;
  state.title = filePath.split('/').pop().replace(/\.[^.]+$/, '');
  $('#editor-title').value = state.title;
  state.blocks = BlockEditor.parseMarkdown(content);
  if (state.blocks.length === 0) {
    state.blocks = [{ id: BlockEditor.nextId(), type: 'text', content: '', meta: {} }];
  }
  renderAllBlocks(state.blocks);
}

// ── Init ──────────────────────────────────────────────────────

function init() {
  state.blocks = [{ id: BlockEditor.nextId(), type: 'text', content: '', meta: {} }];
  renderAllBlocks(state.blocks);
  const firstBlock = els.blockEditorInner.querySelector('.block');
  if (firstBlock) focusBlock(firstBlock);
}

init();

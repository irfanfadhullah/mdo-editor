const { app, BrowserWindow } = require('electron');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'smoke-preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 3) errors.push(message);
  });
  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    errors.push('preload failed: ' + preloadPath + ': ' + error.message);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    errors.push('renderer gone: ' + details.reason);
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  assert(!errors.length, 'renderer load errors: ' + errors.join(' | '));

  const markdown = await win.webContents.executeJavaScript(`
    (async () => {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const assert = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const blocks = () => [...document.querySelectorAll('.block')];
      const textOf = (block) => (block.querySelector('.block-content')?.innerText || '').trim();
      const input = (el) => el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      const pickerItem = (name) => [...document.querySelectorAll('.block-type-picker .block-picker-item')]
        .find(item => item.textContent.includes(name));
      const slashItem = (name) => [...document.querySelectorAll('.slash-menu .slash-menu-item')]
        .find(item => item.textContent.includes(name));
      const placeCaretAtEnd = (el) => {
        el.focus();
        const target = el.lastChild && el.lastChild.nodeType === Node.TEXT_NODE ? el.lastChild : el;
        const offset = target.nodeType === Node.TEXT_NODE ? target.textContent.length : target.childNodes.length;
        const range = document.createRange();
        range.setStart(target, offset);
        range.setEnd(target, offset);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      };

      document.querySelector('#btn-edit-toggle').click();
      await delay(50);
      assert(document.querySelector('#block-editor').classList.contains('editing'), 'edit mode did not enable');
      assert(blocks().length === 1, 'new document should start with one block');

      const first = blocks()[0].querySelector('.block-content');
      first.textContent = 'Draft text';
      input(first);
      document.querySelector('.add-block-row[data-after="1"] .add-block').click();
      await delay(100);
      assert(blocks().length === 2, 'plain text add did not create a second block');
      assert(textOf(blocks()[0]) === 'Draft text', 'adding a block lost unsaved typed text');
      assert(blocks()[1].dataset.blockType === 'text', 'plain add should create text block');

      document.querySelector('.add-block-row[data-after="2"] .add-block-type-toggle').click();
      await delay(25);
      pickerItem('Heading 1').click();
      await delay(100);
      assert(blocks()[2].dataset.blockType === 'heading-1', 'type picker did not insert heading-1');
      assert(blocks()[2].querySelector('.block-content').classList.contains('h1'), 'heading class alias is missing');

      const slashBlock = blocks()[1].querySelector('.block-content');
      slashBlock.textContent = '/';
      input(slashBlock);
      await delay(25);
      slashItem('Heading 2').click();
      await delay(100);
      assert(blocks()[1].dataset.blockType === 'heading-2', 'slash menu did not convert block type');
      assert(textOf(blocks()[1]) === '', 'slash command text was not cleared after conversion');

      const converted = blocks()[1].querySelector('.block-content');
      converted.textContent = 'Slash heading';
      input(converted);
      placeCaretAtEnd(converted);
      converted.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }));
      await delay(100);
      assert(blocks()[2].dataset.blockType === 'text', 'converted block did not keep keydown listeners after re-render');

      const endIndex = blocks().length;
      document.querySelector('.add-block-row[data-after="' + endIndex + '"] .add-block-type-toggle').click();
      await delay(25);
      pickerItem('Image').click();
      await delay(150);
      const imageBlock = blocks()[blocks().length - 1];
      assert(imageBlock.dataset.blockType === 'image', 'type picker did not insert image block');
      const img = imageBlock.querySelector('img');
      assert(img && img.dataset.src === 'file:///tmp/mdo-smoke-image.png', 'image original src was not stored');
      assert(textOf(imageBlock).includes('mdo-smoke-image.png'), 'image caption was not initialized from filename');

      const liveFirst = blocks()[0].querySelector('.block-content');
      liveFirst.textContent = 'Draft text updated';
      input(liveFirst);
      window.__mockSavePath = '/tmp/mdo-smoke-output.mdo';
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }));
      await delay(150);
      assert(window.__lastMdoWrite && window.__lastMdoWrite.payload, 'save did not write an MDO archive');
      const entries = await window.mdoAPI.listArchive('/tmp/mdo-smoke-output.mdo');
      const names = entries.map(entry => entry.name);
      assert(names.includes('manifest.json'), 'saved MDO missed manifest.json');
      assert(names.includes('document.md'), 'saved MDO missed document.md');
      assert(names.includes('assets/mdo-smoke-image.png'), 'saved MDO missed copied image asset');
      const savedMarkdown = await window.mdoAPI.readArchive('/tmp/mdo-smoke-output.mdo', 'document.md');
      assert(savedMarkdown.includes('Draft text updated'), 'saved markdown missed edited text');
      assert(
        savedMarkdown.includes('![mdo-smoke-image.png](assets/mdo-smoke-image.png)'),
        'saved MDO markdown did not rewrite image source into assets/'
      );
      assert(document.querySelectorAll('.tab-item').length === 1, 'save created a duplicate tab');
      assert(window.__savedNotifications.length === 0, 'main editor should not emit document:saved on save');

      return savedMarkdown;
    })()
  `);

  await win.loadFile(path.join(__dirname, '..', 'src', 'editor.html'));

  const composerMarkdown = await win.webContents.executeJavaScript(`
    (async () => {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const assert = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const blocks = () => [...document.querySelectorAll('.block')];
      const input = (el) => el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      const pickerItem = (name) => [...document.querySelectorAll('.block-type-picker .block-picker-item')]
        .find(item => item.textContent.includes(name));

      assert(blocks().length === 1, 'composer should start with one block');
      const first = blocks()[0].querySelector('.block-content');
      first.textContent = 'Composer text';
      input(first);
      document.querySelector('.add-block-row[data-after="1"] .add-block-type-toggle').click();
      await delay(25);
      pickerItem('Heading 3').click();
      await delay(100);
      assert(blocks()[0].querySelector('.block-content').innerText.trim() === 'Composer text', 'composer add lost typed text');
      assert(blocks()[1].dataset.blockType === 'heading-3', 'composer type picker did not insert heading-3');
      assert(blocks()[1].querySelector('.block-content').classList.contains('h3'), 'composer heading alias is missing');

      document.querySelector('.add-block-row[data-after="2"] .add-block-type-toggle').click();
      await delay(25);
      pickerItem('Image').click();
      await delay(150);
      const imageBlock = blocks()[blocks().length - 1];
      assert(imageBlock.dataset.blockType === 'image', 'composer type picker did not insert image block');
      assert(imageBlock.querySelector('img')?.dataset.src === 'file:///tmp/mdo-smoke-image.png', 'composer image src was not stored');

      window.__mockSavePath = '/tmp/mdo-smoke-composer.mdo';
      document.querySelector('#btn-save').click();
      await delay(150);
      assert(window.__lastMdoWrite && window.__lastMdoWrite.payload, 'composer save did not write an MDO archive');
      const entries = await window.mdoAPI.listArchive('/tmp/mdo-smoke-composer.mdo');
      const names = entries.map(entry => entry.name);
      assert(names.includes('manifest.json'), 'composer MDO missed manifest.json');
      assert(names.includes('document.md'), 'composer MDO missed document.md');
      assert(names.includes('assets/mdo-smoke-image.png'), 'composer MDO missed copied image asset');
      const savedMarkdown = await window.mdoAPI.readArchive('/tmp/mdo-smoke-composer.mdo', 'document.md');
      assert(savedMarkdown.includes('Composer text'), 'composer save missed typed text');
      assert(
        savedMarkdown.includes('![mdo-smoke-image.png](assets/mdo-smoke-image.png)'),
        'composer MDO did not rewrite image source into assets/'
      );
      assert(window.__savedNotifications.length === 0, 'composer should not emit document:saved on save');
      return savedMarkdown;
    })()
  `);

  assert(!errors.length, 'renderer console errors: ' + errors.join(' | '));
  console.log('Block editor smoke test passed.');
  console.log(markdown.trim().split('\\n').slice(-4).join('\\n'));
  console.log(composerMarkdown.trim().split('\\n').slice(-4).join('\\n'));
}

app.whenReady()
  .then(main)
  .then(() => app.quit())
  .catch((err) => {
    console.error(err.stack || err.message || err);
    app.exit(1);
  });

const { app, BrowserWindow } = require('electron');
const path = require('path');

const featurePath = path.resolve(process.argv[2] || '/home/pipip/Downloads/mdo-feature-test.mdo');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'smoke-preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const hardErrors = [];
  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    hardErrors.push('preload failed: ' + preloadPath + ': ' + error.message);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    hardErrors.push('renderer gone: ' + details.reason);
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  assert(!hardErrors.length, 'renderer load errors: ' + hardErrors.join(' | '));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const featurePath = ${JSON.stringify(featurePath)};
      const featureMarkdownPath = featurePath.replace(/\\.mdo$/i, '.md');
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const assert = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const blockEls = () => [...document.querySelectorAll('.block')];
      const blockOf = (type) => blockEls().find(block => block.dataset.blockType === type);
      const textOf = (block) => (block?.querySelector('.block-content')?.innerText || '').trim();
      const expectedTypes = [
        'text', 'heading-1', 'heading-2', 'heading-3', 'page',
        'bulleted-list', 'numbered-list', 'todo-list', 'toggle-list',
        'quote', 'callout', 'code', 'divider', 'table', 'columns',
        'image', 'video', 'audio', 'file', 'embed', 'bookmark',
        'equation', 'pdf',
      ];
      const waitForFeatureBlocks = async () => {
        for (let attempt = 0; attempt < 30 && blockEls().length < expectedTypes.length; attempt++) {
          await delay(100);
        }
        await delay(500);
      };
      const assertFeatureBlocks = (label) => {
        const actualTypes = blockEls().map(block => block.dataset.blockType);
        assert(actualTypes.length === expectedTypes.length, label + ': expected ' + expectedTypes.length + ' blocks, got ' + actualTypes.length + ': ' + actualTypes.join(', '));
        expectedTypes.forEach((type, index) => {
          assert(actualTypes[index] === type, label + ': block ' + index + ' should be ' + type + ', got ' + actualTypes[index]);
        });

        assert(textOf(blockOf('page')).includes('Related child page'), label + ': page block did not render');
        assert(blockOf('todo-list').querySelector('.todo-checkbox.checked'), label + ': todo checkbox did not render checked');
        assert(blockOf('toggle-list').querySelector('.toggle-content')?.textContent.includes('Toggle list summary'), label + ': toggle summary did not parse');
        assert(blockOf('toggle-list').querySelector('.toggle-children')?.textContent.includes('Hidden toggle child content'), label + ': toggle children did not parse');
        assert(blockOf('columns').querySelectorAll('.column-block').length === 3, label + ': columns block did not parse three columns');
        const equation = blockOf('equation');
        assert(equation.querySelector('.latex-frac'), label + ': equation fraction did not render');
        assert(equation.querySelector('.latex-root'), label + ': equation square root did not render');
        assert(equation.querySelector('.latex-op'), label + ': equation operator limits did not render');
        assert(equation.querySelector('.latex-matrix'), label + ': equation matrix did not render');

        const image = blockOf('image').querySelector('img');
        const video = blockOf('video').querySelector('video');
        const audio = blockOf('audio').querySelector('audio');
        const pdfFrame = blockOf('pdf').querySelector('iframe');
        const embedFrame = blockOf('embed').querySelector('iframe');

        assert(image?.dataset.src === 'assets/feature-image.jpg', label + ': image dataset src was wrong');
        assert(video?.dataset.src === 'assets/feature-video.mp4', label + ': video dataset src was wrong');
        assert(audio?.dataset.src === 'assets/feature-audio.mp3', label + ': audio dataset src was wrong');
        assert(pdfFrame?.dataset.src === 'assets/feature-document.pdf', label + ': pdf dataset src was wrong');
        assert(image.src.startsWith('data:image/'), label + ': image did not load from data URL');
        assert(video.src.startsWith('data:video/'), label + ': video did not load from data URL');
        assert(audio.src.startsWith('data:audio/'), label + ': audio did not load from data URL');
        assert(pdfFrame.src.startsWith('data:application/pdf'), label + ': pdf did not load from data URL');
        assert(embedFrame.src.startsWith('data:text/html,'), label + ': embed iframe did not use fixture data URL');
        return actualTypes;
      };

      const tightColumns = BlockEditor.parseMarkdown('<!-- columns -->\\nColumn A\\n---col---\\nColumn B\\n![Tight image](assets/feature-image.jpg)');
      assert(tightColumns.length === 2, 'columns parser swallowed following media when no blank line was present');
      assert(tightColumns[0].type === 'columns' && tightColumns[1].type === 'image', 'tight columns/media parse produced wrong types');

      const corruptedColumns = BlockEditor.parseMarkdown('<!-- columns -->\\nColumn A ---col--- Column B![Image block from media_example](assets/feature-image.jpg) [Video block from media_example](assets/feature-video.mp4) [Audio block from media_example](assets/feature-audio.mp3) [Generic file attachment](assets/feature-attachment.txt) [Embed](data:text/html,%3Cp%3Eok%3C%2Fp%3E) [Bookmark block - example.com](https://example.com/mdo-feature-test) $$\\\\frac{1}{2}$$ [PDF block from media_example](assets/feature-document.pdf)');
      const corruptedTypes = corruptedColumns.map(block => block.type);
      assert(corruptedTypes.join(',') === 'columns,image,video,audio,file,embed,bookmark,equation,pdf', 'corrupted columns/media repair produced wrong types: ' + corruptedTypes.join(','));

      await openMarkdown(featureMarkdownPath);
      await waitForFeatureBlocks();
      assertFeatureBlocks('markdown fixture');
      {
        const originalAlert = window.alert;
        let alertCalls = 0;
        window.alert = () => { alertCalls++; };
        const pageContent = blockOf('page').querySelector('.page-block');
        pageContent.click();
        await delay(50);
        assert(alertCalls === 0, 'page block opened a blocking alert');
        assert(pageContent.classList.contains('page-missing'), 'page block did not show non-modal missing-target state');
        window.alert = originalAlert;
      }

      await openArchive(featurePath);
      await waitForFeatureBlocks();
      const actualTypes = assertFeatureBlocks('mdo fixture');

      window.__mockSavePath = '/tmp/mdo-feature-roundtrip.mdo';
      const tab = activeTab();
      tab.filePath = null;
      tab.editableFile = null;
      await saveCurrentFile();
      await delay(200);
      const entries = await window.mdoAPI.listArchive('/tmp/mdo-feature-roundtrip.mdo');
      const names = entries.map(entry => entry.name).sort();
      for (const name of ['manifest.json', 'metadata.json', 'document.md', 'assets/feature-image.jpg', 'assets/feature-video.mp4', 'assets/feature-audio.mp3', 'assets/feature-document.pdf', 'assets/feature-attachment.txt']) {
        assert(names.includes(name), 'round trip archive missed ' + name);
      }
      const markdown = await window.mdoAPI.readArchive('/tmp/mdo-feature-roundtrip.mdo', 'document.md');
      for (const snippet of ['[Page block - Related child page](page:feature-child-page)', '[Embed](data:text/html,', '\\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}', '\\\\begin{bmatrix}', '<!-- columns -->', '<!-- toggle -->']) {
        assert(markdown.includes(snippet), 'round trip markdown missed ' + snippet);
      }

      return {
        openedBlocks: actualTypes.length,
        archiveEntries: names.length,
        markdownPreview: markdown.trim().split('\\n').slice(0, 8).join('\\n'),
      };
    })()
  `);

  assert(!hardErrors.length, 'renderer errors: ' + hardErrors.join(' | '));
  console.log('Feature MDO smoke test passed.');
  console.log(JSON.stringify(result, null, 2));
}

app.whenReady()
  .then(main)
  .then(() => app.quit())
  .catch((err) => {
    console.error(err.stack || err.message || err);
    app.exit(1);
  });

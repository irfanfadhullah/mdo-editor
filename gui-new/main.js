const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { writeMdoArchive } = require('./mdo-archive');

const isMac = process.platform === 'darwin';

let mainWindow = null;

const PRELOAD_PATH = path.join(__dirname, 'preload.js');

// ── Application Menu ───────────────────────────────────────────

function buildAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow && mainWindow.webContents.send('menu:new'),
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow && mainWindow.webContents.send('menu:open'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow && mainWindow.webContents.send('menu:save'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About MDO Viewer',
          click: () => {
            dialog.showMessageBox(mainWindow || undefined, {
              type: 'info',
              title: 'About MDO Viewer',
              message: 'MDO Viewer v0.1.0',
              detail: 'Elegant Markdown & MDO document viewer.\nBuilt with Electron.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── Window creation ──

function createMainWindow(filePath) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 500,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    autoHideMenuBar: false,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'src', 'assets', 'mdo-view.png'),
    title: 'MDO Viewer',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.on('console-message', (_, level, message) => {
    const prefix = level >= 3 ? 'RENDERER-ERR:' : 'RENDERER:';
    console.log(`[${prefix}] ${message}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[main] Window loaded');
    if (filePath && fs.existsSync(filePath)) {
      console.log('[main] Opening startup file:', filePath);
      mainWindow.webContents.send('open-file', path.resolve(filePath));
    }
  });

  if (isMac) {
    mainWindow.on('ready-to-show', () => {
      mainWindow.webContents.insertCSS(`
        .toolbar { -webkit-app-region: drag; }
        .toolbar button, .toolbar input, .toolbar .btn { -webkit-app-region: no-drag; }
      `);
    });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC handlers ──

function setupIPC() {
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'MDO & Markdown', extensions: ['mdo', 'md', 'markdown', 'mdown'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (_, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options.title || 'Save',
      defaultPath: options.defaultPath,
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled) return null;
    return result.filePath;
  });

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('fs:readDir', async (_, dirPath) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        isFile: e.isFile(),
        path: path.join(dirPath, e.name),
      }));
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('fs:stat', async (_, filePath) => {
    try {
      const stat = fs.statSync(filePath);
      return {
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
      };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('fs:readFile', async (_, filePath, encoding = 'utf8') => {
    try {
      const result = fs.readFileSync(filePath, encoding);
      console.log('[main] readFile:', filePath, '| size:', result.length);
      return result;
    } catch (err) {
      console.error('[main] readFile error:', err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle('fs:writeFile', async (_, filePath, data) => {
    try {
      fs.writeFileSync(filePath, data, 'utf8');
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('fs:writeBase64', async (_, filePath, base64) => {
    try {
      fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('fs:writeMdoArchive', async (_, filePath, payload) => {
    try {
      writeMdoArchive(filePath, payload || {});
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('fs:readArchive', async (_, zipPath, entryName, encoding = 'utf8') => {
    console.log('[main] readArchive:', zipPath, '| entry:', entryName);
    const AdmZip = require('adm-zip');
    try {
      const zip = new AdmZip(zipPath);
      const entry = zip.getEntry(entryName);
      if (!entry) return { error: `Entry not found: ${entryName}` };
      const result = encoding === 'base64'
        ? zip.readAsText(entryName, 'base64')
        : zip.readAsText(entryName, encoding);
      console.log('[main] readArchive result:', result.length, 'chars');
      return result;
    } catch (err) {
      console.error('[main] readArchive error:', err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle('fs:listArchive', async (_, zipPath) => {
    console.log('[main] listArchive:', zipPath);
    const AdmZip = require('adm-zip');
    try {
      const zip = new AdmZip(zipPath);
      const result = zip.getEntries().map(e => ({
        name: e.entryName,
        isDirectory: e.isDirectory,
        size: e.header.size,
      }));
      console.log('[main] listArchive result:', result.length, 'entries');
      return result;
    } catch (err) {
      console.error('[main] listArchive error:', err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle('shell:openInBrowser', async (_, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('export:pdf', async (_, html, title) => {
    return new Promise((resolve, reject) => {
      const pdfWin = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
        },
      });
      const htmlWithTitle = html.replace('<title></title>', '<title>' + (title || 'Untitled') + '</title>');
      pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlWithTitle));
      pdfWin.webContents.on('did-finish-load', () => {
        pdfWin.webContents.printToPDF({
          printBackground: true,
          marginsType: 1,
          pageSize: 'A4',
        }).then((data) => {
          pdfWin.close();
          resolve(data.toString('base64'));
        }).catch((err) => {
          pdfWin.close();
          reject(err);
        });
      });
    });
  });

  ipcMain.handle('export:docx', async (_, blocks, title) => {
    try {
      var xml = renderDocxXml(blocks, title);
      var savePath = await dialog.showSaveDialog(mainWindow, {
        title: 'Export DOCX',
        defaultPath: (title || 'untitled') + '.docx',
        filters: [{ name: 'Word Document', extensions: ['docx'] }],
      });
      if (!savePath || savePath.canceled) return null;
      writeDocxFile(savePath.filePath || savePath, xml);
      return savePath.filePath || savePath;
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('media:getDataUrl', async (_, filePath) => {
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp', '.tiff': 'image/tiff',
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
        '.flac': 'audio/flac', '.aac': 'audio/aac',
        '.pdf': 'application/pdf',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      return { dataUrl: 'data:' + mime + ';base64,' + data.toString('base64') };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('media:getArchiveDataUrl', async (_, zipPath, entryName) => {
    const AdmZip = require('adm-zip');
    try {
      const zip = new AdmZip(zipPath);
      let entry = zip.getEntry(entryName);
      if (!entry) {
        // Try case-insensitive match
        const entries = zip.getEntries();
        entry = entries.find(e => e.entryName.toLowerCase() === entryName.toLowerCase());
      }
      if (!entry) return { error: `Entry not found: ${entryName}` };
      const data = entry.getData();
      const ext = path.extname(entryName).toLowerCase();
      const mimeMap = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.mp4': 'video/mp4', '.webm': 'video/webm',
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
        '.pdf': 'application/pdf',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      return { dataUrl: 'data:' + mime + ';base64,' + data.toString('base64') };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('window:openComposer', async (_, filePath) => {
    createEditorWindow(filePath);
  });

  ipcMain.handle('window:closeComposer', async () => {
    if (editorWindow && !editorWindow.isDestroyed()) {
      editorWindow.close();
    }
  });

  ipcMain.on('document:saved', (event, filePath) => {
    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      event.sender !== mainWindow.webContents
    ) {
      mainWindow.webContents.send('open-file', filePath);
    }
  });
}

// ── App lifecycle ──

app.whenReady().then(() => {
  console.log('[main] App ready');

  buildAppMenu();
  setupIPC();

  let filePath = null;
  if (process.argv.length > 1) {
    const maybePath = process.argv.find(a => a.match(/\.(mdo|md|markdown|mdown)$/i));
    if (maybePath && fs.existsSync(maybePath)) {
      filePath = maybePath;
    }
  }

  createMainWindow(filePath);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('open-file', filePath);
  } else {
    createMainWindow(filePath);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- DOCX helpers ---

function escapeXml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderDocxBlockXml(block) {
  var type = block.type;
  var content = (block.content || '').trim();
  var meta = block.meta || {};
  switch (type) {
    case 'heading-1': return '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'heading-2': return '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'heading-3': return '<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'bulleted-list': return '<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'numbered-list': return '<w:p><w:pPr><w:pStyle w:val="ListNumber"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'todo-list': return '<w:p><w:r><w:t>' + (meta.checked ? '☒ ' : '☐ ') + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'quote': return '<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'code': return '<w:p><w:pPr><w:shd w:fill="F5F5F7" w:val="clear"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'callout': return '<w:p><w:pPr><w:shd w:fill="EDF4FF" w:val="clear"/></w:pPr><w:r><w:t>' + (meta.icon || '💡') + ' ' + escapeXml(content) + '</w:t></w:r></w:p>';
    case 'divider': return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D9D9D9"/></w:pBdr></w:pPr></w:p>';
    case 'image': return '<w:p><w:r><w:t>' + escapeXml(content || '[Image]') + '</w:t></w:r></w:p>';
    case 'equation': return '<w:p><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
    default:
      return content.split('\n').map(function(line) {
        return '<w:p><w:r><w:t xml:space="preserve">' + escapeXml(line || ' ') + '</w:t></w:r></w:p>';
      }).join('');
  }
}

function renderDocxXml(blocks, title) {
  var body = '';
  for (var i = 0; i < (blocks || []).length; i++) body += renderDocxBlockXml(blocks[i]);
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + body + '</w:body></w:document>';
}

function writeDocxFile(filePath, docXml) {
  var AdmZip = require('adm-zip');
  var zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>', 'utf8'));
  zip.addFile('_rels/.rels', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>', 'utf8'));
  zip.addFile('word/document.xml', Buffer.from(docXml, 'utf8'));
  zip.writeZip(filePath);
}

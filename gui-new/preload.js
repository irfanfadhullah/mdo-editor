const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mdoAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  stat: (filePath) => ipcRenderer.invoke('fs:stat', filePath),
  readFile: (filePath, encoding) => ipcRenderer.invoke('fs:readFile', filePath, encoding),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  writeMdoArchive: (filePath, payload) => ipcRenderer.invoke('fs:writeMdoArchive', filePath, payload),
  readArchive: (zipPath, entry, encoding) => ipcRenderer.invoke('fs:readArchive', zipPath, entry, encoding),
  listArchive: (zipPath) => ipcRenderer.invoke('fs:listArchive', zipPath),

  openInBrowser: (url) => ipcRenderer.invoke('shell:openInBrowser', url),
  getMediaDataUrl: (filePath) => ipcRenderer.invoke('media:getDataUrl', filePath),
  getArchiveDataUrl: (zipPath, entryName) => ipcRenderer.invoke('media:getArchiveDataUrl', zipPath, entryName),

  printToPDF: (html, title) => ipcRenderer.invoke('export:pdf', html, title),
  exportDOCX: (blocks, title) => ipcRenderer.invoke('export:docx', blocks, title),
  writeExportFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  writeBase64: (filePath, base64) => ipcRenderer.invoke('fs:writeBase64', filePath, base64),

  onOpenFile: (callback) => ipcRenderer.on('open-file', (_, path) => callback(path)),
  onEditFile: (callback) => ipcRenderer.on('edit-file', (_, path) => callback(path)),

  onMenuNew: (callback) => ipcRenderer.on('menu:new', () => callback()),
  onMenuOpen: (callback) => ipcRenderer.on('menu:open', () => callback()),
  onMenuSave: (callback) => ipcRenderer.on('menu:save', () => callback()),

  notifyDocumentSaved: (filePath) => ipcRenderer.send('document:saved', filePath),
});

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { writeMdoArchive } = require('../mdo-archive');

window.__lastWrite = null;
window.__lastMdoWrite = null;
window.__savedNotifications = [];

const smokeImagePath = '/tmp/mdo-smoke-image.png';
if (!fs.existsSync(smokeImagePath)) {
  fs.writeFileSync(smokeImagePath, Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82,
  ]));
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.flac': 'audio/flac', '.aac': 'audio/aac',
    '.pdf': 'application/pdf', '.txt': 'text/plain',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function toDataUrl(filePath, data) {
  return 'data:' + mimeFor(filePath) + ';base64,' + data.toString('base64');
}

window.mdoAPI = {
  openFile: async () => window.__mockOpenFilePaths || [smokeImagePath],
  openFolder: async () => null,
  saveFile: async () => window.__mockSavePath || '/tmp/mdo-smoke-output.md',
  selectFolder: async () => null,

  readDir: async () => [],
  stat: async () => ({ isFile: true, isDirectory: false, size: 0 }),
  readFile: async (filePath, encoding = 'utf8') => {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch (err) {
      return { error: err.message };
    }
  },
  writeFile: async (filePath, data) => {
    window.__lastWrite = { filePath, data };
    return { ok: true };
  },
  writeMdoArchive: async (filePath, payload) => {
    writeMdoArchive(filePath, payload);
    window.__lastMdoWrite = { filePath, payload };
    return { ok: true };
  },
  readArchive: async (zipPath, entryName, encoding = 'utf8') => {
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry(entryName);
    if (!entry) return { error: `Entry not found: ${entryName}` };
    return encoding === 'base64'
      ? entry.getData().toString('base64')
      : zip.readAsText(entryName, encoding);
  },
  listArchive: async (zipPath) => {
    const zip = new AdmZip(zipPath);
    return zip.getEntries().map(entry => ({
      name: entry.entryName,
      isDirectory: entry.isDirectory,
      size: entry.header.size,
    }));
  },

  openInBrowser: async () => {},
  getMediaDataUrl: async (filePath) => {
    try {
      const resolved = String(filePath || '').replace(/^file:\/\//i, '');
      return { dataUrl: toDataUrl(resolved, fs.readFileSync(resolved)) };
    } catch (err) {
      return { error: err.message };
    }
  },
  getArchiveDataUrl: async (zipPath, entryName) => {
    try {
      const zip = new AdmZip(zipPath);
      const safeEntryName = String(entryName || '').replace(/^\/+/, '');
      const entry = zip.getEntry(safeEntryName) || zip.getEntries().find(e => e.entryName.toLowerCase() === safeEntryName.toLowerCase());
      if (!entry) return { error: `Entry not found: ${entryName}` };
      return { dataUrl: toDataUrl(safeEntryName, entry.getData()) };
    } catch (err) {
      return { error: err.message };
    }
  },

  onOpenFile: () => {},
  onEditFile: () => {},
  onMenuNew: () => {},
  onMenuOpen: () => {},
  onMenuSave: () => {},
  onMenuFind: () => {},
  onMenuFindNext: () => {},
  onMenuFindPrev: () => {},
  onMenuZoomIn: () => {},
  onMenuZoomOut: () => {},
  onMenuZoomReset: () => {},

  notifyDocumentSaved: (filePath) => {
    window.__savedNotifications.push(filePath);
  },
};

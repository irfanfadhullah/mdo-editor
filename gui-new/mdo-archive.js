const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function safeZipEntryName(entryName) {
  return String(entryName || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/');
}

function archiveEntry(zip, entryName) {
  const safeName = safeZipEntryName(entryName);
  let entry = zip.getEntry(safeName);
  if (!entry) {
    entry = zip.getEntries().find(e => e.entryName.toLowerCase() === safeName.toLowerCase());
  }
  return entry;
}

function writeMdoArchive(filePath, payload = {}) {
  const zip = new AdmZip();
  const archiveCache = new Map();
  const manifest = {
    ...(payload.manifest || {}),
    format: 'mdo',
    version: payload.manifest?.version || '1.0',
    document: 'document.md',
    modifiedAt: new Date().toISOString(),
  };

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
  zip.addFile('document.md', Buffer.from(payload.markdown || '', 'utf8'));

  if (payload.metadata) {
    zip.addFile('metadata.json', Buffer.from(JSON.stringify(payload.metadata, null, 2), 'utf8'));
  }

  for (const asset of payload.assets || []) {
    const entryName = safeZipEntryName(asset.entryName);
    if (!entryName) continue;

    if (asset.sourcePath) {
      const sourcePath = asset.sourcePath.replace(/^file:\/\//i, '');
      zip.addFile(entryName, fs.readFileSync(sourcePath));
      continue;
    }

    if (asset.archivePath && asset.sourceEntry) {
      const sourceArchivePath = path.resolve(asset.archivePath);
      if (!archiveCache.has(sourceArchivePath)) {
        archiveCache.set(sourceArchivePath, new AdmZip(sourceArchivePath));
      }
      const sourceZip = archiveCache.get(sourceArchivePath);
      const sourceEntry = archiveEntry(sourceZip, asset.sourceEntry);
      if (sourceEntry) {
        zip.addFile(entryName, sourceEntry.getData());
      }
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  zip.writeZip(filePath);
}

module.exports = {
  safeZipEntryName,
  writeMdoArchive,
};

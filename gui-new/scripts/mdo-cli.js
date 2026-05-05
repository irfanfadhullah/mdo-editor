#!/usr/bin/env node
// MDO CLI — pack, unpack, batch convert
// Usage:
//   node mdo-cli.js pack <folder>         → creates <folder>.mdo
//   node mdo-cli.js unpack <file.mdo>     → extracts to <file.mdo.d>/
//   node mdo-cli.js batch <folder>        → convert all .md → .mdo
//   node mdo-cli.js batch:md <folder>     → convert all .mdo → .md

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function pack(folderPath) {
  const folder = path.resolve(folderPath);
  const stat = fs.statSync(folder, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory()) {
    console.error('Error: ' + folder + ' is not a directory');
    process.exit(1);
  }

  const name = path.basename(folder);
  const output = path.resolve(folder + '.mdo');
  const docFile = path.join(folder, 'document.md');
  const assetsDir = path.join(folder, 'assets');

  const manifest = {
    format: 'mdo',
    version: '1.0',
    title: name,
    document: 'document.md',
    files: ['document.md'],
    assets: [],
    createdAt: new Date().toISOString(),
  };

  const zip = new AdmZip();

  if (fs.existsSync(docFile)) {
    zip.addFile('document.md', fs.readFileSync(docFile));
  } else {
    zip.addFile('document.md', Buffer.from('', 'utf8'));
  }

  if (fs.existsSync(assetsDir)) {
    walkDir(assetsDir, assetsDir, function(relPath, fullPath) {
      var entryName = 'assets/' + relPath.replace(/\\/g, '/');
      zip.addFile(entryName, fs.readFileSync(fullPath));
      manifest.files.push(entryName);
      manifest.assets.push({ path: entryName, name: path.basename(relPath) });
    });
  }

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

  const metadata = {
    format: 'mdo-metadata',
    version: '1.0',
    title: name,
    blocks: [],
    media: [],
    relations: [],
  };
  zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2), 'utf8'));

  zip.writeZip(output);
  console.log('Packed: ' + output + ' (' + manifest.files.length + ' files)');
}

function unpack(mdoPath) {
  const input = path.resolve(mdoPath);
  if (!fs.existsSync(input)) {
    console.error('Error: ' + input + ' not found');
    process.exit(1);
  }

  const name = path.basename(input).replace(/\.mdo$/i, '');
  const outDir = path.resolve(input + '.d');
  fs.mkdirSync(outDir, { recursive: true });

  const zip = new AdmZip(input);
  const entries = zip.getEntries();
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const outPath = path.join(outDir, entry.entryName);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, entry.getData());
  }
  console.log('Unpacked: ' + outDir + ' (' + entries.length + ' entries)');
}

function batchToMdo(folderPath) {
  const folder = path.resolve(folderPath);
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  var count = 0;
  for (const entry of entries) {
    var name = entry.name.toLowerCase();
    if (entry.isFile() && (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.mdown'))) {
      var src = path.join(folder, entry.name);
      var assetsDir = path.join(folder, path.basename(entry.name, path.extname(entry.name)) + '_assets');
      var out = src.replace(/\.md$/i, '.mdo').replace(/\.markdown$/i, '.mdo').replace(/\.mdown$/i, '.mdo');

      var zip = new AdmZip();
      zip.addFile('document.md', fs.readFileSync(src));

      var manifest = {
        format: 'mdo', version: '1.0',
        title: path.basename(entry.name, path.extname(entry.name)),
        document: 'document.md',
        files: ['document.md'],
        assets: [],
        createdAt: new Date().toISOString(),
      };

      if (fs.existsSync(assetsDir)) {
        walkDir(assetsDir, assetsDir, function(relPath, fullPath) {
          var entryName = 'assets/' + relPath.replace(/\\/g, '/');
          zip.addFile(entryName, fs.readFileSync(fullPath));
          manifest.files.push(entryName);
          manifest.assets.push({ path: entryName, name: path.basename(relPath) });
        });
      }

      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
      zip.addFile('metadata.json', Buffer.from(JSON.stringify({
        format: 'mdo-metadata', version: '1.0',
        title: manifest.title, blocks: [], media: [], relations: [],
      }, null, 2), 'utf8'));

      zip.writeZip(out);
      count++;
      console.log('  ' + entry.name + ' → ' + path.basename(out));
    }
  }
  console.log('Batch: ' + count + ' .md → .mdo');
}

function batchToMd(folderPath) {
  const folder = path.resolve(folderPath);
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  var count = 0;
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.mdo')) {
      var src = path.join(folder, entry.name);
      var out = src.replace(/\.mdo$/i, '.md');
      try {
        var zip = new AdmZip(src);
        var docEntry = zip.getEntry('document.md');
        if (docEntry) {
          fs.writeFileSync(out, docEntry.getData());
          count++;
          console.log('  ' + entry.name + ' → ' + path.basename(out));
        } else {
          console.error('  Skip ' + entry.name + ': no document.md');
        }
      } catch (e) {
        console.error('  Error ' + entry.name + ': ' + e.message);
      }
    }
  }
  console.log('Batch: ' + count + ' .mdo → .md');
}

function walkDir(base, dir, callback) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var entry of entries) {
    var full = path.join(dir, entry.name);
    var rel = path.relative(base, full);
    if (entry.isDirectory()) walkDir(base, full, callback);
    else callback(rel, full);
  }
}

var cmd = process.argv[2];
var target = process.argv[3];

if (!cmd || !target) {
  console.log('MDO CLI — pack, unpack, batch convert');
  console.log('');
  console.log('  node mdo-cli.js pack <folder>        Pack folder into .mdo archive');
  console.log('  node mdo-cli.js unpack <file.mdo>    Extract .mdo archive');
  console.log('  node mdo-cli.js batch:to-mdo <dir>   Convert all .md → .mdo in dir');
  console.log('  node mdo-cli.js batch:to-md <dir>    Convert all .mdo → .md in dir');
  process.exit(0);
}

if (cmd === 'pack') pack(target);
else if (cmd === 'unpack') unpack(target);
else if (cmd === 'batch:to-mdo') batchToMdo(target);
else if (cmd === 'batch:to-md') batchToMd(target);
else {
  console.error('Unknown command: ' + cmd);
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const DEFAULT_MEDIA_DIR = '/home/pipip/Downloads/media_example';
const DEFAULT_OUTPUT = '/home/pipip/Downloads/mdo-feature-test.mdo';

const mediaDir = path.resolve(process.argv[2] || DEFAULT_MEDIA_DIR);
const outputPath = path.resolve(process.argv[3] || DEFAULT_OUTPUT);
const title = 'MDO Feature Test';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findMedia(extensions) {
  if (!fs.existsSync(mediaDir)) fail(`Media folder not found: ${mediaDir}`);
  const files = fs.readdirSync(mediaDir)
    .map(name => path.join(mediaDir, name))
    .filter(filePath => fs.statSync(filePath).isFile());
  const found = files.find(filePath => extensions.includes(path.extname(filePath).toLowerCase()));
  if (!found) fail(`Missing media file in ${mediaDir}: ${extensions.join(', ')}`);
  return found;
}

function serializeMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'divider':
        lines.push('---');
        break;
      case 'heading-1':
        lines.push('# ' + block.content);
        break;
      case 'heading-2':
        lines.push('## ' + block.content);
        break;
      case 'heading-3':
        lines.push('### ' + block.content);
        break;
      case 'bulleted-list':
        lines.push('- ' + block.content);
        break;
      case 'numbered-list':
        lines.push('1. ' + block.content);
        break;
      case 'todo-list':
        lines.push('- [' + (block.meta?.checked ? 'x' : ' ') + '] ' + block.content);
        break;
      case 'toggle-list':
        lines.push('<!-- toggle -->');
        lines.push('<details>');
        lines.push('<summary>' + block.content + '</summary>');
        if (block.meta?.children) lines.push(block.meta.children);
        lines.push('</details>');
        break;
      case 'quote':
        lines.push('> ' + block.content.replace(/\n/g, '\n> '));
        break;
      case 'callout':
        lines.push('<!-- callout -->');
        for (const part of block.content.split('\n')) lines.push('> ' + part);
        break;
      case 'code':
        lines.push('```' + (block.meta?.language || ''));
        lines.push(block.content);
        lines.push('```');
        break;
      case 'table':
      case 'columns':
        if (block.type === 'columns') lines.push('<!-- columns -->');
        lines.push(block.content);
        break;
      case 'image':
        lines.push('![' + block.content + '](' + block.meta.src + ')');
        break;
      case 'video':
      case 'audio':
      case 'file':
      case 'pdf':
        lines.push('[' + block.content + '](' + block.meta.src + ')');
        break;
      case 'bookmark':
        lines.push('[' + block.content + '](' + block.meta.url + ')');
        break;
      case 'embed':
        lines.push('[Embed](' + block.meta.url + ')');
        break;
      case 'equation':
        lines.push('$$');
        lines.push(block.content);
        lines.push('$$');
        break;
      case 'page':
        lines.push('[' + block.content + '](page:' + block.meta.id + ')');
        break;
      default:
        lines.push(block.content);
        break;
    }
    lines.push('');
  }
  return lines.join('\n');
}

function metadataFor(blocks, mediaBlocks) {
  return {
    format: 'mdo-metadata',
    version: '1.0',
    title,
    blocks: blocks.map(block => {
      const copy = {
        id: block.id,
        type: block.type,
        content: block.content || '',
      };
      if (block.meta?.language) copy.language = block.meta.language;
      const media = mediaBlocks.find(item => item.blockId === block.id);
      if (media) copy.mediaIds = [media.id];
      return copy;
    }),
    media: mediaBlocks.map(({ blockId, ...media }) => media),
    relations: [],
  };
}

const imagePath = findMedia(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const videoPath = findMedia(['.mp4', '.webm', '.mov', '.mkv']);
const audioPath = findMedia(['.mp3', '.wav', '.ogg', '.flac', '.aac']);
const pdfPath = findMedia(['.pdf']);

const assetFiles = [
  { entryName: 'assets/feature-image' + path.extname(imagePath).toLowerCase(), sourcePath: imagePath },
  { entryName: 'assets/feature-video' + path.extname(videoPath).toLowerCase(), sourcePath: videoPath },
  { entryName: 'assets/feature-audio' + path.extname(audioPath).toLowerCase(), sourcePath: audioPath },
  { entryName: 'assets/feature-document.pdf', sourcePath: pdfPath },
];

const attachmentEntry = 'assets/feature-attachment.txt';
const embedHtml = encodeURIComponent('<!doctype html><html><body style="font-family:sans-serif;margin:24px"><h1>MDO embed test</h1><p>This iframe is stored as a data URL so the fixture works offline.</p></body></html>');

const blocks = [
  {
    id: 'block-text',
    type: 'text',
    content: 'Text block: plain text with **bold**, *italic*, `inline code`, ~~strike~~, and inline math $a^2+b^2=c^2$.',
  },
  { id: 'block-h1', type: 'heading-1', content: 'Heading 1 - Complete MDO Feature Fixture' },
  { id: 'block-h2', type: 'heading-2', content: 'Heading 2 - Basic, Lists, Content, Media, Technical' },
  { id: 'block-h3', type: 'heading-3', content: 'Heading 3 - Round Trip Smoke Coverage' },
  { id: 'block-page', type: 'page', content: 'Page block - Related child page', meta: { id: 'feature-child-page' } },
  { id: 'block-ul', type: 'bulleted-list', content: 'Bulleted list item for /ul' },
  { id: 'block-ol', type: 'numbered-list', content: 'Numbered list item for /ol' },
  { id: 'block-todo', type: 'todo-list', content: 'To-do list item for /todo', meta: { checked: true } },
  {
    id: 'block-toggle',
    type: 'toggle-list',
    content: 'Toggle list summary for /toggle',
    meta: { children: 'Hidden toggle child content. This should survive parse and save.' },
  },
  { id: 'block-quote', type: 'quote', content: 'Quote block for /q.\nSecond quote line.' },
  { id: 'block-callout', type: 'callout', content: 'Callout block for /callout.\nUse this to confirm callout formatting.', meta: { icon: 'i' } },
  {
    id: 'block-code',
    type: 'code',
    content: 'const feature = "mdo";\nconsole.log(`Testing ${feature} blocks`);',
    meta: { language: 'javascript' },
  },
  { id: 'block-divider', type: 'divider', content: '' },
  {
    id: 'block-table',
    type: 'table',
    content: '| Block | Command | Status |\n| --- | --- | --- |\n| Text | /text | ok |\n| Media | /img /vid /aud /pdf | ok |',
  },
  {
    id: 'block-columns',
    type: 'columns',
    content: ['Column one checks layout.', 'Column two checks editable column text.', 'Column three checks serialization.'].join('\n---col---\n'),
    meta: { columns: ['Column one checks layout.', 'Column two checks editable column text.', 'Column three checks serialization.'] },
  },
  { id: 'block-image', type: 'image', content: 'Image block from media_example', meta: { src: assetFiles[0].entryName } },
  { id: 'block-video', type: 'video', content: 'Video block from media_example', meta: { src: assetFiles[1].entryName } },
  { id: 'block-audio', type: 'audio', content: 'Audio block from media_example', meta: { src: assetFiles[2].entryName } },
  { id: 'block-file', type: 'file', content: 'Generic file attachment', meta: { src: attachmentEntry } },
  { id: 'block-embed', type: 'embed', content: 'Embedded HTML preview', meta: { url: 'data:text/html,' + embedHtml } },
  { id: 'block-bookmark', type: 'bookmark', content: 'Bookmark block - example.com', meta: { url: 'https://example.com/mdo-feature-test' } },
  {
    id: 'block-equation',
    type: 'equation',
    content: [
      '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
      '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
      '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
    ].join('\n'),
  },
  { id: 'block-pdf', type: 'pdf', content: 'PDF block from media_example', meta: { src: assetFiles[3].entryName } },
];

const mediaBlocks = [
  { id: 'media-image', blockId: 'block-image', path: assetFiles[0].entryName, type: 'image' },
  { id: 'media-video', blockId: 'block-video', path: assetFiles[1].entryName, type: 'video' },
  { id: 'media-audio', blockId: 'block-audio', path: assetFiles[2].entryName, type: 'audio' },
  { id: 'media-file', blockId: 'block-file', path: attachmentEntry, type: 'file' },
  { id: 'media-pdf', blockId: 'block-pdf', path: assetFiles[3].entryName, type: 'pdf' },
];

const markdown = serializeMarkdown(blocks);
const manifest = {
  format: 'mdo',
  version: '1.0',
  title,
  document: 'document.md',
  metadata: 'metadata.json',
  files: ['document.md', 'metadata.json', ...assetFiles.map(asset => asset.entryName), attachmentEntry],
  assets: [...assetFiles.map(asset => ({ path: asset.entryName })), { path: attachmentEntry }],
  createdBy: 'scripts/create-feature-test-mdo.js',
  modifiedAt: new Date().toISOString(),
};

const zip = new AdmZip();
zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadataFor(blocks, mediaBlocks), null, 2), 'utf8'));
zip.addFile('document.md', Buffer.from(markdown, 'utf8'));
for (const asset of assetFiles) {
  zip.addFile(asset.entryName, fs.readFileSync(asset.sourcePath));
}
zip.addFile(attachmentEntry, Buffer.from('Generic file attachment for the MDO feature fixture.\n', 'utf8'));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
zip.writeZip(outputPath);

const markdownPath = outputPath.replace(/\.mdo$/i, '.md');
const markdownAssetDir = path.join(path.dirname(markdownPath), 'assets');
fs.mkdirSync(markdownAssetDir, { recursive: true });
fs.writeFileSync(markdownPath, markdown, 'utf8');
for (const asset of assetFiles) {
  fs.copyFileSync(asset.sourcePath, path.join(path.dirname(markdownPath), asset.entryName));
}
fs.writeFileSync(path.join(path.dirname(markdownPath), attachmentEntry), 'Generic file attachment for the MDO feature fixture.\n', 'utf8');

console.log(`Created ${outputPath}`);
console.log(`Created ${markdownPath}`);
console.log(`Blocks: ${blocks.map(block => block.type).join(', ')}`);
console.log(`Assets: ${manifest.assets.map(asset => asset.path).join(', ')}`);

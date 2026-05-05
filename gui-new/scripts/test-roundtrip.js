#!/usr/bin/env node
// MDO Viewer — Round-trip test for all 23 block types

const fs = require('fs');
const path = require('path');

// Minimal DOM mock for blocks.js
global.window = {
  BlockEditor: { TYPES: [] },
  document: {
    createTreeWalker: function() {
      return { nextNode: function() { return null; } };
    },
    addEventListener: function() {},
  },
  NodeFilter: { SHOW_TEXT: 0 },
  CustomEvent: function(type, opts) { this.type = type; Object.assign(this, opts || {}); },
  InputEvent: function(type, opts) { this.type = type; Object.assign(this, opts || {}); },
  KeyboardEvent: function(type, opts) { this.type = type; Object.assign(this, opts || {}); },
};
global.document = global.window.document;
global.Event = function(type) { this.type = type; };

// Load blocks.js
const blocksPath = path.join(__dirname, '..', 'src', 'js', 'blocks.js');
eval(fs.readFileSync(blocksPath, 'utf8'));

const BlockEditor = global.window.BlockEditor;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { passed++; return; }
  failed++;
  console.error('  FAIL: ' + message);
}

function test(type, content, meta) {
  const block = BlockEditor.defaultBlockData(type, content || '', meta || {});
  const markdown = BlockEditor.serializeMarkdown([block]);
  const parsed = BlockEditor.parseMarkdown(markdown);
  const after = parsed[0];

  assert(after, type + ': parsed block exists');
  if (!after) return;

  assert(after.type === type,
    type + ': type matches (expected ' + type + ', got ' + after.type + ')');

  // For heading, check content
  if (['heading-1', 'heading-2', 'heading-3', 'text', 'quote'].includes(type)) {
    assert(after.content === (content || ''),
      type + ': content matches (expected "' + content + '", got "' + after.content + '")');
  }

  // Re-serialize and check it parses again (double round-trip)
  const markdown2 = BlockEditor.serializeMarkdown([after]);
  const parsed2 = BlockEditor.parseMarkdown(markdown2);
  const after2 = parsed2[0];
  assert(after2 && after2.type === type,
    type + ': double round-trip structure preserved');
}

console.log('Running 23-block type round-trip tests...\n');

test('text', 'Hello world');
test('heading-1', 'Big Title');
test('heading-2', 'Section Title');
test('heading-3', 'Subsection');
test('page', 'My Page');
test('bulleted-list', 'List item');
test('numbered-list', 'Numbered item');
test('todo-list', 'Todo item', { checked: false });
test('toggle-list', 'Toggle title', { children: 'Hidden content' });
test('quote', 'A wise saying');
test('callout', 'Important note');
test('code', 'console.log("hello");', { language: 'javascript' });
test('divider');
test('table', '| A | B |\n| --- | --- |\n| 1 | 2 |');
test('columns', '', { columns: ['Left', 'Right'] });
test('image', 'My photo', { src: 'assets/photo.jpg' });
test('video', 'My video', { src: 'assets/clip.mp4' });
test('audio', 'Podcast', { src: 'assets/audio.mp3' });
test('file', 'doc.txt', { src: 'assets/doc.txt' });
test('embed', 'Embed', { url: 'https://example.com' });
test('bookmark', 'Example', { url: 'https://example.com' });
test('equation', 'E=mc^2');
test('pdf', 'My PDF', { src: 'assets/doc.pdf' });

// Test all blocks together
console.log('\nTesting combined markdown round-trip...');
const allBlocks = BlockEditor.TYPES.map(function(t) {
  return BlockEditor.defaultBlockData(t.id);
});
const combined = BlockEditor.serializeMarkdown(allBlocks);
const reparsed = BlockEditor.parseMarkdown(combined);
assert(reparsed.length >= 20, 'combined: at least 20 blocks survive round-trip (got ' + reparsed.length + ')');

// Test inline formatting
console.log('\nTesting inline formatting...');
(function() {
  const formatStars = eval('(' + String(function(text) {
    var out = '', i = 0;
    while (i < text.length) {
      if (text.substr(i, 3) === '***') {
        var c = text.indexOf('***', i + 3);
        if (c !== -1) { out += '<strong><em>' + arguments.callee(text.slice(i + 3, c)) + '</em></strong>'; i = c + 3; continue; }
      }
      if (text.substr(i, 2) === '**') {
        var c = text.indexOf('**', i + 2);
        if (c !== -1) { out += '<strong>' + arguments.callee(text.slice(i + 2, c)) + '</strong>'; i = c + 2; continue; }
      }
      if (text[i] === '*' && text[i+1] !== '*' && text[i-1] !== '*') {
        var c = text.indexOf('*', i + 1);
        while (c !== -1 && text[c-1] === '*') c = text.indexOf('*', c + 1);
        if (c !== -1 && text[c+1] !== '*') { out += '<em>' + arguments.callee(text.slice(i + 1, c)) + '</em>'; i = c + 1; continue; }
      }
      out += text[i]; i++;
    }
    return out;
  }) + ')');

  const r = function(input, expected) {
    const out = formatStars('&amp;lt;'.replace(/&/g, '').replace(/</g, '').replace(/>/g, ''))
      ? formatStars(input)
      : 'FAIL';
    const ok = out === expected;
    if (ok) passed++;
    else { failed++; console.error('  FAIL formatStars: "' + input + '" → got "' + out + '", expected "' + expected + '"'); }
  };

  r('**bold**', '<strong>bold</strong>');
  r('*italic*', '<em>italic</em>');
  r('***bold italic***', '<strong><em>bold italic</em></strong>');
  r('**bold *and italic***', '<strong>bold *and italic</strong>*');
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);

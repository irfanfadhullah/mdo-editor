// ── MDO Viewer — DOCX Export (lightweight, no extra deps) ────
// Uses adm-zip to create a minimal valid .docx from blocks

(function() {
  function escapeXml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function renderBlockXml(block) {
    var type = block.type;
    var content = (block.content || '').trim();
    var meta = block.meta || {};

    switch (type) {
      case 'heading-1':
        return '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'heading-2':
        return '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'heading-3':
        return '<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'bulleted-list':
        return '<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'numbered-list':
        return '<w:p><w:pPr><w:pStyle w:val="ListNumber"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'todo-list':
        var ch = meta.checked ? '☒ ' : '☐ ';
        return '<w:p><w:r><w:t>' + escapeXml(ch + content) + '</w:t></w:r></w:p>';
      case 'quote':
        return '<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'code':
        return '<w:p><w:pPr><w:shd w:fill="F5F5F7" w:val="clear"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'callout':
        var icon = meta.icon || '💡';
        return '<w:p><w:pPr><w:shd w:fill="EDF4FF" w:val="clear"/></w:pPr><w:r><w:t>' + icon + ' ' + escapeXml(content) + '</w:t></w:r></w:p>';
      case 'divider':
        return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D9D9D9"/></w:pBdr></w:pPr></w:p>';
      case 'image':
        return '<w:p><w:r><w:t>' + escapeXml(content || '[Image]') + '</w:t></w:r></w:p>';
      case 'equation':
        return '<w:p><w:r><w:t>' + escapeXml(content) + '</w:t></w:r></w:p>';
      default:
        if (content) {
          var lines = content.split('\n');
          return lines.map(function(l) {
            return '<w:p><w:r><w:t>' + escapeXml(l || ' ') + '</w:t></w:r></w:p>';
          }).join('');
        }
        return '<w:p><w:r><w:t></w:t></w:r></w:p>';
    }
  }

  function renderDocxXml(blocks, title) {
    var bodyXml = '';
    for (var i = 0; i < blocks.length; i++) {
      bodyXml += renderBlockXml(blocks[i]);
    }

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" ' +
      'xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main" ' +
      'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
      'xmlns:mv="urn:schemas-microsoft-com:mac:vml" ' +
      'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
      'xmlns:v="urn:schemas-microsoft-com:vml" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:w10="urn:schemas-microsoft-com:office:word" ' +
      'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">' +
      '<w:body>' + bodyXml + '</w:body></w:document>';
  }

  window.ExportDOCX = {
    renderDocxXml: renderDocxXml,
    escapeXml: escapeXml,
  };
})();

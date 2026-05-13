// ── MDO Viewer — HTML / PDF Export ──────────────────────────

(function() {
  const CSS_RESET = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:16px;line-height:1.7;color:#1d1d1f;background:#fff;padding:60px 0 120px;-webkit-font-smoothing:antialiased}
.block-editor-inner{max-width:760px;margin:0 auto;padding:0 60px}
.block{position:relative;margin:4px 0;border-radius:6px}
.block-content{flex:1;min-width:0;padding:4px 6px;border-radius:6px;outline:none;font-size:15px;line-height:1.6;color:#1d1d1f;word-break:break-word}
.block-content.h1{font-size:36px;font-weight:700;line-height:1.2;padding:8px 6px;margin-top:12px}
.block-content.h2{font-size:26px;font-weight:600;line-height:1.3;padding:6px 6px;margin-top:12px}
.block-content.h3{font-size:20px;font-weight:600;line-height:1.3;padding:4px 6px;margin-top:10px}
.block-content.quote{border-left:3px solid #007aff;padding-left:14px;color:#6e6e73;font-style:italic}
.block-content.callout{display:flex;gap:12px;padding:14px 16px;border-radius:8px;background:#edf4ff;border:1px solid #d7e3f9}
.callout-icon{font-size:20px;flex-shrink:0;line-height:1.6}
.callout-body{flex:1;font-size:15px;line-height:1.6}
.block-content.code-block{font-family:'SF Mono',Consolas,monospace;font-size:13.5px;line-height:1.55;background:#f5f5f7;border-radius:8px;padding:16px;white-space:pre-wrap}
.block-content.divider{border-bottom:1px solid #e8e8ed;margin:12px 0;padding:2px 6px}
.block-content.bulleted-list,.block-content.numbered-list,.block-content.todo-list{padding-left:22px;position:relative}
.block-content.bulleted-list::before{content:'•';position:absolute;left:4px;color:#6e6e73}
.block-content.numbered-list{counter-increment:n;padding-left:26px}
.block-content.numbered-list::before{content:counter(n)'.';position:absolute;left:4px;color:#6e6e73;font-weight:500}
.block-content.todo-list .todo-checkbox{position:absolute;left:0;top:5px;width:16px;height:16px;border:2px solid #aeaeb2;border-radius:3px;display:inline-block}
.block-content.todo-list .todo-checkbox.checked{background:#007aff;border-color:#007aff}
.block-content.todo-list.checked{text-decoration:line-through;color:#aeaeb2}
.block-content.table-block{padding:0;overflow-x:auto}
.block-table{border-collapse:collapse;width:100%;margin:4px 0}
.block-table th,.block-table td{border:1px solid #e8e8ed;padding:8px 12px;text-align:left;min-width:100px;font-size:14px}
.block-table th{background:#f5f5f7;font-weight:600}
.block-content.columns-block{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:0}
.column-block{padding:16px;border:1px solid #e8e8ed;border-radius:8px;background:#f5f5f7;min-height:80px}
.block-content.image-block{padding:0;overflow:hidden}
.block-content.image-block img{display:block;width:100%;height:auto;max-height:600px;object-fit:contain;border-radius:8px}
.block-content.image-block .image-caption{display:block;padding:4px 6px;font-size:13px;color:#6e6e73;text-align:center;margin-top:4px}
.block-content.embed-block{padding:0}
.block-content.embed-block video,.block-content.embed-block audio{width:100%;max-width:100%;max-height:480px;border-radius:8px}
.block-content.embed-block iframe{width:100%;max-width:100%;max-height:480px;border:1px solid #e8e8ed;border-radius:8px}
.block-content.bookmark-block{display:flex;gap:12px;padding:14px;border:1px solid #e8e8ed;border-radius:8px;background:#f5f5f7}
.bookmark-thumb{width:100px;height:68px;border-radius:6px;background:#e8e8ed;flex-shrink:0}
.bookmark-info{flex:1;min-width:0}
.bookmark-title{font-weight:600;font-size:14px;margin-bottom:2px}
.bookmark-desc{font-size:12px;color:#6e6e73;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bookmark-url{font-size:11px;color:#aeaeb2;margin-top:4px}
.block-content.file-block{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #e8e8ed;border-radius:8px;background:#f5f5f7}
.file-icon{font-size:24px;flex-shrink:0}
.file-name{font-size:14px;font-weight:500}
.file-size{font-size:11px;color:#aeaeb2}
.block-content.equation-block{font-family:'Latin Modern Math',serif;font-size:18px;padding:12px 14px;text-align:center;background:#f5f5f7;border:1px solid #e8e8ed;border-radius:8px}
.block-content.page-block{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #e8e8ed;border-radius:8px;background:#f5f5f7;font-weight:500}
.page-icon{font-size:18px}
.inline-code{font-family:'SF Mono',Consolas,monospace;font-size:0.88em;padding:0.18em 0.42em;background:#e8e8ed;border-radius:4px}
a{color:#007aff;text-decoration:none}
a:hover{text-decoration:underline}
`;

  function renderBlockHtml(block) {
    var type = block.type;
    var content = block.content || '';
    var meta = block.meta || {};

    switch (type) {
      case 'text':
        return '<div class="block-content text">' + renderInlineContent(content) + '</div>';
      case 'heading-1':
        return '<div class="block-content h1">' + renderInlineContent(content) + '</div>';
      case 'heading-2':
        return '<div class="block-content h2">' + renderInlineContent(content) + '</div>';
      case 'heading-3':
        return '<div class="block-content h3">' + renderInlineContent(content) + '</div>';
      case 'bulleted-list':
        return '<div class="block-content bulleted-list">' + renderInlineContent(content) + '</div>';
      case 'numbered-list':
        return '<div class="block-content numbered-list">' + renderInlineContent(content) + '</div>';
      case 'todo-list': {
        var ch = meta.checked ? ' checked' : '';
        return '<div class="block-content todo-list' + ch + '"><span class="todo-checkbox' + ch + '"></span>' + renderInlineContent(content) + '</div>';
      }
      case 'quote':
        return '<div class="block-content quote">' + renderInlineContent(content) + '</div>';
      case 'callout': {
        var icon = meta.icon || '💡';
        return '<div class="block-content callout"><span class="callout-icon">' + icon + '</span><div class="callout-body">' + renderInlineContent(content) + '</div></div>';
      }
      case 'code': {
        var lang = meta.language ? '<div style="position:absolute;top:8px;right:12px;font-size:11px;color:#aeaeb2;text-transform:uppercase;font-family:sans-serif">' + escapeHtml(meta.language) + '</div>' : '';
        return '<div class="block-content code-block" style="position:relative">' + lang + escapeHtml(content) + '</div>';
      }
      case 'mermaid':
        return '<div class="block-content code-block" style="position:relative"><div style="position:absolute;top:8px;right:12px;font-size:11px;color:#aeaeb2;text-transform:uppercase;font-family:sans-serif">mermaid</div>' + escapeHtml(content) + '</div>';
      case 'divider':
        return '<div class="block-content divider"></div>';
      case 'table':
        if (!content) return '<div class="block-content table-block"></div>';
        var rowsHtml = content.split('\n').filter(function(r) { return r.trim(); });
        var tableHtml = '<table class="block-table">';
        for (var ri = 0; ri < rowsHtml.length; ri++) {
          var cells = splitTableCells(rowsHtml[ri]);
          if (ri === 1 && /^[-: ]+$/.test(cells.join(''))) continue;
          tableHtml += '<tr>';
          for (var ci = 0; ci < cells.length; ci++) {
            tableHtml += (ri === 0 ? '<th>' : '<td>') + escapeHtml(cells[ci].trim()) + (ri === 0 ? '</th>' : '</td>');
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</table>';
        return '<div class="block-content table-block">' + tableHtml + '</div>';
      case 'columns': {
        var cols = meta.columns || [content || 'Column 1', 'Column 2'];
        var colHtml = '';
        for (var ci = 0; ci < cols.length; ci++) {
          colHtml += '<div class="column-block">' + escapeHtml(cols[ci]) + '</div>';
        }
        return '<div class="block-content columns-block">' + colHtml + '</div>';
      }
      case 'image': {
        var src = meta.src || '';
        var caption = content ? '<span class="image-caption">' + escapeHtml(content) + '</span>' : '';
        var imgTag = src ? '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(content || '') + '">' : '';
        return '<div class="block-content image-block">' + imgTag + caption + '</div>';
      }
      case 'video':
        if (meta.src) return '<div class="block-content embed-block"><video controls src="' + escapeAttr(meta.src) + '" style="max-width:100%;max-height:480px;border-radius:8px"></video></div>';
        return '<div class="block-content embed-block"></div>';
      case 'audio':
        if (meta.src) return '<div class="block-content embed-block"><audio controls src="' + escapeAttr(meta.src) + '" style="width:100%"></audio></div>';
        return '<div class="block-content embed-block"></div>';
      case 'file': {
        var name = content || (meta.src || 'File');
        return '<div class="block-content file-block"><span class="file-icon">📎</span><div><div class="file-name">' + escapeHtml(name) + '</div></div></div>';
      }
      case 'bookmark': {
        var url = meta.url || '';
        return '<div class="block-content bookmark-block"><div class="bookmark-thumb"></div><div class="bookmark-info"><div class="bookmark-title">' + escapeHtml(content || 'Bookmark') + '</div><div class="bookmark-url">' + escapeHtml(url) + '</div></div></div>';
      }
      case 'embed':
        if (meta.url) return '<div class="block-content embed-block"><iframe src="' + escapeAttr(meta.url) + '" style="width:100%;min-height:400px;border:1px solid #e8e8ed;border-radius:8px"></iframe></div>';
        return '<div class="block-content embed-block"></div>';
      case 'equation':
        if (window.katex && typeof window.katex.renderToString === 'function') {
          try {
            return '<div class="block-content equation-block">' + window.katex.renderToString(content || '', {
              displayMode: true,
              output: 'htmlAndMathml',
              strict: 'ignore',
              throwOnError: false,
            }) + '</div>';
          } catch (_) {}
        }
        return '<div class="block-content equation-block">' + escapeHtml(content || '') + '</div>';
      case 'page':
        return '<div class="block-content page-block"><span class="page-icon">▦</span><span>' + escapeHtml(content || 'Untitled Page') + '</span></div>';
      case 'pdf':
        if (meta.src) return '<div class="block-content embed-block"><iframe src="' + escapeAttr(meta.src) + '" style="width:100%;min-height:500px;border:1px solid #e8e8ed;border-radius:8px"></iframe></div>';
        return '<div class="block-content embed-block"></div>';
      default:
        return '<div class="block-content text">' + escapeHtml(content) + '</div>';
    }
  }

  function renderInlineContent(text) {
    if (!text) return '';
    return escapeHtml(text)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(m, alt, url) { return '<img src="' + escapeAttr(url.trim()) + '" alt="' + escapeAttr(alt) + '" style="max-height:1.5em;max-width:100%;vertical-align:middle;border-radius:3px">'; })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function splitTableCells(row) {
    var cells = [];
    var current = '';
    for (var i = 0; i < row.length; i++) {
      if (row[i] === '\\' && row[i + 1] === '|') { current += '|'; i++; }
      else if (row[i] === '|') { cells.push(current); current = ''; }
      else { current += row[i]; }
    }
    if (current || row[row.length - 1] === '|') cells.push(current);
    return cells;
  }

  function renderHtmlDoc(blocks, title) {
    var bodyHtml = '';
    for (var i = 0; i < blocks.length; i++) {
      bodyHtml += '<div class="block">' + renderBlockHtml(blocks[i]) + '</div>';
    }
    bodyHtml = bodyHtml || '<div class="block"><div class="block-content text">(empty document)</div></div>';

    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>' + escapeHtml(title || 'Untitled') + '</title>\n<style>\n' + CSS_RESET + '\n</style>\n</head>\n<body>\n<div class="block-editor-inner">\n' + bodyHtml + '\n</div>\n</body>\n</html>';
  }

  window.ExportHTML = {
    renderHtmlDoc: renderHtmlDoc,
    renderBlockHtml: renderBlockHtml,
  };
})();

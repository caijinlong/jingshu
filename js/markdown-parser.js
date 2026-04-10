/**
 * markdown-parser.js — 将拼音注音 markdown 转换为 HTML
 *
 * 输入格式：般(bō)若(rě)波(bō)罗(luó)蜜(mì)多(duō)
 * 输出格式：<ruby>般<rp>(</rp><rt>bō</rt><rp>)</rp></ruby>...
 */
window.MarkdownParser = {
  // 匹配 汉字(拼音)
  PINYIN_RE: /([\u4e00-\u9fff\u3400-\u4dbf])\(([a-zA-Z\u00fc\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9\u01d6\u01d8\u01da\u01dc]+)\)/g,

  convertPinyin(text) {
    return text.replace(this.PINYIN_RE, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>');
  },

  parse(markdown) {
    const lines = markdown.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Empty line
      if (line.trim() === '') { i++; continue; }

      // Horizontal rule
      if (/^---+\s*$/.test(line.trim())) {
        blocks.push('<hr>');
        i++; continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = this.inline(headingMatch[2]);
        blocks.push(`<h${level}>${content}</h${level}>`);
        i++; continue;
      }

      // Blockquote (collect consecutive > lines)
      if (line.trimStart().startsWith('>')) {
        let bqLines = [];
        while (i < lines.length && lines[i].trimStart().startsWith('>')) {
          bqLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        const content = bqLines.map(l => this.inline(l)).join('<br>');
        blocks.push(`<blockquote><p>${content}</p></blockquote>`);
        continue;
      }

      // Regular paragraph (collect until empty line, heading, hr, or blockquote)
      let paraLines = [];
      while (i < lines.length && lines[i].trim() !== '' &&
             !/^---+\s*$/.test(lines[i].trim()) &&
             !/^#{1,6}\s/.test(lines[i]) &&
             !lines[i].trimStart().startsWith('>')) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        const content = paraLines.map(l => this.inline(l)).join('<br>');
        blocks.push(`<p>${content}</p>`);
      }
    }

    return blocks.join('\n');
  },

  inline(text) {
    // First convert pinyin (inside ** markers too)
    let result = this.convertPinyin(text);
    // Bold
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return result;
  }
};

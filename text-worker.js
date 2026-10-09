self.onmessage = event => {
  try {
    const { buffer, text, mode, options } = event.data || {};
    const source = typeof text === 'string'
      ? text
      : new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    self.postMessage({ chunks: splitText(source, mode, options || {}) });
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) });
  }
};

function splitText(source, mode, options = {}) {
  const preserveIndents = Boolean(options.preserveIndents);
  const compactBlankLines = Boolean(options.compactBlankLines);
  const maxCharsPerLine = Number(options.maxCharsPerLine) || 0;

  let cleanText = String(source || '')
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (!preserveIndents) {
    cleanText = cleanText.replace(/\t/g, ' ').replace(/ +/g, ' ');
  }

  function applyMaxChars(str, limit) {
    if (!limit || limit <= 0 || str.length <= limit) return [str];
    const words = str.split(' ');
    const res = [];
    let cur = '';
    for (const w of words) {
      if (!cur) {
        cur = w;
      } else if ((cur + ' ' + w).length <= limit) {
        cur += ' ' + w;
      } else {
        res.push(cur);
        cur = w;
      }
    }
    if (cur) res.push(cur);
    return res.length ? res : [str];
  }

  // 1. Line-by-Line: 1 dòng gốc = 1 dòng/ô đọc
  if (mode === 'line') {
    const rawLines = cleanText.split('\n');
    const chunks = [];
    rawLines.forEach(line => {
      const lineText = preserveIndents ? line : line.trim();
      if (compactBlankLines && !lineText.trim()) return;
      if (maxCharsPerLine > 0) {
        applyMaxChars(lineText, maxCharsPerLine).forEach(w => chunks.push(w));
      } else {
        chunks.push(lineText);
      }
    });
    return chunks.length > 0 ? chunks : [cleanText];
  }

  // 2. Sentence-by-Sentence
  if (mode === 'sentence') {
    const raw = cleanText.split(/([.!?…\n]+)/);
    const chunks = [];
    let current = '';
    raw.forEach(part => {
      current += part;
      if (current.trim().length > 20 || part.includes('\n')) {
        const s = preserveIndents ? current : current.trim();
        if (s.trim().length > 0) {
          if (maxCharsPerLine > 0) {
            applyMaxChars(s, maxCharsPerLine).forEach(w => chunks.push(w));
          } else {
            chunks.push(s);
          }
        }
        current = '';
      }
    });
    if (current.trim()) {
      const s = preserveIndents ? current : current.trim();
      if (maxCharsPerLine > 0) {
        applyMaxChars(s, maxCharsPerLine).forEach(w => chunks.push(w));
      } else {
        chunks.push(s);
      }
    }
    return chunks;
  }

  // 3. Paragraph mode
  const chunks = [];
  cleanText.split(/\n\s*\n|\n/).forEach(paragraph => {
    const trimmed = preserveIndents ? paragraph : paragraph.trim();
    if (!trimmed.trim()) return;
    if (maxCharsPerLine > 0) {
      applyMaxChars(trimmed, maxCharsPerLine).forEach(w => chunks.push(w));
      return;
    }
    if (trimmed.length <= 250) {
      chunks.push(trimmed);
      return;
    }
    const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmed];
    let bufferText = '';
    sentences.forEach(sentence => {
      if ((bufferText + sentence).length > 220 && bufferText) {
        chunks.push(bufferText.trim());
        bufferText = sentence;
      } else {
        bufferText += ` ${sentence}`;
      }
    });
    if (bufferText.trim()) chunks.push(bufferText.trim());
  });
  return chunks;
}

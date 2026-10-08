self.onmessage = event => {
  try {
    const { buffer, text, mode } = event.data || {};
    const source = typeof text === 'string'
      ? text
      : new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    self.postMessage({ chunks: splitText(source, mode) });
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) });
  }
};

function splitText(source, mode) {
  const cleanText = String(source || '')
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ');

  if (mode === 'sentence') {
    const raw = cleanText.split(/([.!?…\n]+)/);
    const chunks = [];
    let current = '';
    raw.forEach(part => {
      current += part;
      if (current.trim().length > 20 || part.includes('\n')) {
        if (current.trim()) chunks.push(current.trim());
        current = '';
      }
    });
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  const chunks = [];
  cleanText.split(/\n\s*\n|\n/).forEach(paragraph => {
    const trimmed = paragraph.trim();
    if (!trimmed) return;
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

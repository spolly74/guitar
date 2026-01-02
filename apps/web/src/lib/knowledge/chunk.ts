export type TextChunk = {
  index: number;
  content: string;
};

// Simple deterministic chunker: split by paragraphs, then pack into ~N chars.
export function chunkText(input: {
  text: string;
  maxChars?: number; // soft cap
  minChars?: number; // avoid tiny chunks
}): TextChunk[] {
  const maxChars = input.maxChars ?? 900;
  const minChars = input.minChars ?? 200;
  const overlapChars = 120;

  const raw = input.text.replace(/\r\n/g, "\n").trim();
  if (!raw) return [];

  const paras = raw
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";

  function flush() {
    const c = buf.trim();
    if (c) chunks.push(c);
    buf = "";
  }

  for (const p of paras) {
    if (!buf) {
      buf = p;
      continue;
    }
    if ((buf.length + 2 + p.length) <= maxChars) {
      buf = `${buf}\n\n${p}`;
    } else {
      // If buffer is too small, try to add a bit more before flushing.
      if (buf.length < minChars && p.length < maxChars) {
        buf = `${buf}\n\n${p}`;
      } else {
        flush();
        buf = p;
      }
    }
  }
  flush();

  // If any chunk is still huge, fall back to line-based splitting.
  const normalized: string[] = [];
  for (const c of chunks) {
    if (c.length <= maxChars * 1.6) {
      normalized.push(c);
      continue;
    }
    const lines = c.split("\n").map((l) => l.trim()).filter(Boolean);
    let tmp = "";
    for (const line of lines) {
      if (!tmp) {
        tmp = line;
      } else if ((tmp.length + 1 + line.length) <= maxChars) {
        tmp = `${tmp} ${line}`;
      } else {
        normalized.push(tmp);
        tmp = line;
      }
    }
    if (tmp) normalized.push(tmp);
  }

  // Hard-split any remaining long chunks to guarantee multi-chunk ingestion for long pages.
  const finalChunks: string[] = [];
  for (const c of normalized) {
    if (c.length <= maxChars * 1.2) {
      finalChunks.push(c);
      continue;
    }
    let start = 0;
    while (start < c.length) {
      const end = Math.min(c.length, start + maxChars);
      finalChunks.push(c.slice(start, end).trim());
      if (end >= c.length) break;
      start = Math.max(0, end - overlapChars);
    }
  }

  return finalChunks.filter(Boolean).map((content, index) => ({ index, content }));
}

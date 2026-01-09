export type ExtractedChordGrip = { chord: string; voicing: string };

// Extract chord grip strings like:
// - Am (x02210)
// - **Dm7: xx0211**
// - G = 320003
// from arbitrary plain text / markdown-ish instructions.
export function extractChordGripsFromText(text: string): ExtractedChordGrip[] {
  const lines = String(text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ExtractedChordGrip[] = [];

  // Chord symbol: A-G, optional accidental, optional quality, optional extensions, optional slash bass.
  // Then separator or whitespace, optional "(" then voicing [x0-9]{6,24}, optional ")".
  const re =
    /(?:^|\s|[-*])(\*{0,2})\s*([A-G](?:b|#)?(?:maj|min|m|dim|aug|sus)?\d*(?:add\d+)?(?:\/[A-G](?:b|#)?)?)\s*(?:\*{0,2})\s*(?::|=|-|->|\s)\s*\(?\s*([x0-9]{6,24})\s*\)?/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const chord = m[2]!.trim();
    const voicing = m[3]!.trim();
    out.push({ chord, voicing });
  }

  // De-dupe in order
  const seen = new Set<string>();
  const dedup: ExtractedChordGrip[] = [];
  for (const x of out) {
    const key = `${x.chord}::${x.voicing}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(x);
  }

  return dedup;
}

// Extract chord symbols from a "Chord list" section even if no voicings are provided, e.g.:
// Chord list:
// - **Am**
// - **Dm**
// - **G**
export function extractChordSymbolsFromText(text: string): string[] {
  const rawLines = String(text ?? "").split("\n");
  const lines = rawLines.map((l) => l.trimEnd());

  const isHeader = (l: string) => {
    const lower = l.trim().toLowerCase();
    return (
      lower.includes("chord list") ||
      lower.startsWith("chords:") ||
      lower.startsWith("chord:") ||
      lower.includes("use these exact") ||
      lower.includes("use these") && lower.includes("chord")
    );
  };

  // Prefer parsing immediately after a "chord list" header if present.
  let startIdx: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] ?? "";
    if (isHeader(l)) {
      startIdx = i + 1;
      break;
    }
  }

  const out: string[] = [];
  const chordOnlyRe =
    /^\s*[-*]\s*(?:\*{0,2})?\s*([A-G](?:b|#)?(?:maj|min|m|dim|aug|sus)?\d*(?:add\d+)?(?:\/[A-G](?:b|#)?)?)\s*(?:\*{0,2})?\s*$/i;

  const scanRange = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const l = (lines[i] ?? "").trim();
      if (!l) break; // stop at blank line for section-based scan
      // Stop if we hit another section header
      if (i !== from && /:$/i.test(l) && !l.startsWith("-") && !l.startsWith("*")) break;
      const m = l.match(chordOnlyRe);
      if (!m) continue;
      out.push(m[1]!.trim());
    }
  };

  if (startIdx !== null) {
    scanRange(startIdx, lines.length);
  } else {
    // Fallback: scan all lines for bullet items that are *only* a chord symbol.
    for (const l of lines) {
      const m = l.trim().match(chordOnlyRe);
      if (!m) continue;
      out.push(m[1]!.trim());
    }
  }

  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const c of out) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(c);
  }
  return dedup;
}

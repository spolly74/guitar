// Deterministic fallback voicings for common open-chord shapes.
// Used ONLY when a lesson lists chord names but omits explicit voicings.
//
// Format: 6-string compact voicing, low E -> high e, where:
// - "x" = mute
// - "0" = open
// - "1".."24" = fret numbers (1–2 digits)

const VOICINGS: Record<string, string> = {
  // Major
  a: "x02220",
  c: "x32010",
  d: "xx0232",
  e: "022100",
  g: "320003",

  // Minor
  am: "x02210",
  dm: "xx0231",
  em: "022000",

  // Dominant 7
  e7: "020100",
  a7: "x02020",
  d7: "xx0212",

  // Common partial/open-friendly F (often taught as open F)
  f: "xx3211",

  // Diminished (common in C major context)
  bdim: "x20101",
  bdim7: "x20101",
};

function normalizeChordSymbol(chord: string): string {
  let s = String(chord ?? "").trim().toLowerCase();
  s = s.replace(/\s+/g, "");

  // Normalize minor markers
  s = s.replace(/minor/g, "m").replace(/min/g, "m");

  // Normalize major markers that are sometimes explicitly written
  // (Keep maj7 etc. intact by only removing trailing 'maj')
  if (s.endsWith("maj")) s = s.slice(0, -3);
  if (s.endsWith("major")) s = s.slice(0, -5);

  return s;
}

export function getDefaultOpenChordVoicing(chordSymbol: string): string | null {
  const key = normalizeChordSymbol(chordSymbol);
  return VOICINGS[key] ?? null;
}

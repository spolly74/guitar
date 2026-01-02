export type ChordDiagramSpec = {
  type: "chord";
  style: "jazz-clean-v1";
  title?: string; // e.g. "Dm7 (R–7)"
  tuning: string[]; // ["E2","A2","D3","G3","B3","E4"]
  // Strings are ordered low->high (6..1). Values:
  // - null => mute (X)
  // - 0 => open (O)
  // - n>=1 => fret number
  frets: Array<number | null>; // length 6
  base_fret?: number; // if omitted, inferred from frets
  // Optional: mark which string indices (0..5) are roots (for coloring)
  root_strings?: number[];
};

export function isChordSpec(v: unknown): v is ChordDiagramSpec {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<ChordDiagramSpec>;
  return o.type === "chord" && o.style === "jazz-clean-v1" && Array.isArray(o.frets);
}

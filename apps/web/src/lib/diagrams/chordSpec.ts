import type { NoteRole } from "./noteMarker";

export type ChordDiagramSpec = {
  type: "chord";
  style: "jazz-clean-v1";
  title?: string; // e.g. "Dm7 (R–7)"
  tuning: string[]; // ["E2","A2","D3","G3","B3","E4"]

  // PRIMARY DATA: Simple array approach (strings ordered low->high, indices 0-5)
  // - null => mute (X)
  // - 0 => open (O)
  // - n>=1 => fret number
  frets: Array<number | null>; // length 6
  base_fret?: number; // if omitted, inferred from frets

  // PEDAGOGICAL METADATA (optional, aligned with frets array)
  finger_numbers?: Array<number | null>; // 1-4 for fingers, null for no finger marking
  note_roles?: Array<NoteRole | null>; // musical role of each note ('root', 'third', etc.)

  // LEGACY/CONVENIENCE: mark which string indices (0-5) are roots (for coloring)
  // If note_roles is provided, this can be derived from it
  root_strings?: number[];

  // DERIVED FIELDS (backward compatibility, can be computed from frets)
  mutedStrings?: number[]; // indices 0-5 where frets[i] === null
  openStrings?: number[]; // indices 0-5 where frets[i] === 0
};

export function isChordSpec(v: unknown): v is ChordDiagramSpec {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<ChordDiagramSpec>;
  return o.type === "chord" && o.style === "jazz-clean-v1" && Array.isArray(o.frets);
}

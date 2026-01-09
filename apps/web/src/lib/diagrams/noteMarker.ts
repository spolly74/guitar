/**
 * Canonical note marker type as defined in the diagram specification.
 * This represents a single note on the fretboard/chord diagram.
 *
 * Used as the conceptual model, though individual diagram types may use
 * more specialized formats internally.
 */
export type NoteMarker = {
  string: number; // 1–6 (1 = high E, 6 = low E)
  fret: number; // absolute fret number (0 = open, 1+ = fretted)
  finger?: number; // 1–4 (optional fingering hint)
  role?: NoteRole; // musical role of this note
};

export type NoteRole = "root" | "third" | "fifth" | "seventh" | "extension" | "other";

/**
 * Convert a string number (1-6, user-facing) to array index (0-5, internal).
 * String 1 (high E) → index 5
 * String 6 (low E) → index 0
 */
export function stringNumberToIndex(stringNum: number): number {
  if (stringNum < 1 || stringNum > 6) {
    throw new Error(`String number must be 1-6, got ${stringNum}`);
  }
  return 6 - stringNum;
}

/**
 * Convert an array index (0-5, internal) to string number (1-6, user-facing).
 * Index 0 (low E) → string 6
 * Index 5 (high E) → string 1
 */
export function stringIndexToNumber(index: number): number {
  if (index < 0 || index > 5) {
    throw new Error(`String index must be 0-5, got ${index}`);
  }
  return 6 - index;
}

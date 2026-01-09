/**
 * Tablature Diagram Spec
 *
 * For rendering guitar tablature (riffs, licks, melodies).
 */

export interface TablatureNote {
  fret: number | string; // number for fret, "x" for muted, "-" for rest
  technique?: "h" | "p" | "/" | "\\" | "b" | "r" | "~" | "x";
  // h=hammer-on, p=pull-off, /=slide up, \=slide down, b=bend, r=release, ~=vibrato, x=mute
}

export interface TablatureBeat {
  /** Notes on each string for this beat. Index 0 = high E, index 5 = low E */
  notes: (TablatureNote | number | null)[];
  /** Duration in beats (1 = quarter, 0.5 = eighth, etc.) */
  duration?: number;
}

export interface TablatureMeasure {
  beats: TablatureBeat[];
}

export interface ChordAnnotation {
  /** Position in measure (0-indexed beat) */
  beat: number;
  /** Chord name */
  chord: string;
}

export interface TablatureSpec {
  type: "tablature";
  style?: "jazz-clean-v1";

  /** Title of the tab */
  title?: string;

  /** Tempo in BPM (optional, for display) */
  tempo?: number;

  /** Time signature (e.g., "4/4") */
  time_signature?: string;

  /** Measures of tablature */
  measures: TablatureMeasure[];

  /** Chord symbols above the staff */
  chord_symbols?: ChordAnnotation[];
}

export function isTablatureSpec(obj: unknown): obj is TablatureSpec {
  if (typeof obj !== "object" || obj === null) return false;
  const spec = obj as Record<string, unknown>;
  return spec.type === "tablature" && Array.isArray(spec.measures);
}

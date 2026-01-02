export type FretboardMarker = {
  string: number; // 1..6 (1 = high E, 6 = low E)
  fret: number; // 0..N
  label?: string;
  role?: "root" | "chord-tone" | "scale-tone" | "other";
  shape?: "circle";
};

export type FretboardDiagramSpec = {
  type: "fretboard";
  style: "jazz-clean-v1";
  title?: string;
  tuning: string[]; // ["E2","A2","D3","G3","B3","E4"]
  fret_range: [number, number]; // [0, 12]
  markers: FretboardMarker[];
  show_fret_numbers?: boolean;
  color_by_role?: boolean;
};

export function isFretboardSpec(v: unknown): v is FretboardDiagramSpec {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<FretboardDiagramSpec>;
  return o.type === "fretboard" && o.style === "jazz-clean-v1";
}

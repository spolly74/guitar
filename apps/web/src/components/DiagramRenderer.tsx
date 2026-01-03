"use client";

import type { DiagramSpec } from "@/lib/schemas/diagram.schema";
import { isChordSpec } from "@/lib/diagrams/chordSpec";
import { isFretboardSpec } from "@/lib/diagrams/fretboardSpec";
import { ChordDiagram } from "@/app/(app)/today/ChordDiagram";
import { FretboardDiagram } from "@/app/(app)/today/FretboardDiagram";
import { chordSpecFromVoicing, parseCompactVoicingToFrets } from "@/lib/diagrams/voicingToChordSpec";

const STANDARD_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"];

export function coerceDiagramSpec(input: unknown): DiagramSpec | null {
  if (!input || typeof input !== "object") return null;
  const o: any = input;

  // Already valid.
  if (isChordSpec(o) || isFretboardSpec(o)) return o as DiagramSpec;

  // Heuristic: missing `type`, but looks like a chord spec.
  // - frets: number[] length 6
  // - voicing: "x32010"
  if (!o.type) {
    const maybeFrets = o.frets;
    const maybeVoicing = o.voicing ?? o.value;
    const chordLike =
      typeof maybeVoicing === "string" ||
      (Array.isArray(maybeFrets) && maybeFrets.length === 6);
    if (chordLike) {
      const chordSymbol =
        (typeof o.chordSymbol === "string" ? o.chordSymbol : null) ??
        (typeof o.chord === "string" ? o.chord : null) ??
        (typeof o.symbol === "string" ? o.symbol : null) ??
        (typeof o.title === "string" ? o.title : null) ??
        (typeof o.name === "string" ? o.name : null) ??
        "Chord";
      const title = typeof o.title === "string" ? o.title : chordSymbol;
      const tuning = Array.isArray(o.tuning) ? o.tuning : STANDARD_TUNING;

      if (Array.isArray(maybeFrets) && maybeFrets.length === 6) {
        const spec = {
          type: "chord" as const,
          style: "jazz-clean-v1" as const,
          title,
          tuning,
          frets: maybeFrets,
        };
        return isChordSpec(spec) ? (spec as any) : null;
      }

      if (typeof maybeVoicing === "string") {
        try {
          return chordSpecFromVoicing({ chordSymbol, voicing: maybeVoicing, title });
        } catch {
          // fallthrough
        }
      }
    }

    // Heuristic: missing `type`, but looks like a fretboard spec.
    if (Array.isArray(o.markers) && Array.isArray(o.fret_range)) {
      const spec = {
        ...o,
        type: "fretboard",
        style: o.style ?? "jazz-clean-v1",
        tuning: Array.isArray(o.tuning) ? o.tuning : STANDARD_TUNING,
      };
      return isFretboardSpec(spec) ? (spec as any) : null;
    }
  }

  // Coerce chord specs that are missing style/tuning or encode frets as a compact voicing string.
  if (o.type === "chord") {
    const style = o.style ?? "jazz-clean-v1";
    const tuning = Array.isArray(o.tuning) ? o.tuning : STANDARD_TUNING;
    const title = typeof o.title === "string" ? o.title : undefined;

    // Case 1: frets is already an array, just fill style/tuning.
    if (Array.isArray(o.frets)) {
      const spec = { ...o, style, tuning, title };
      return isChordSpec(spec) ? (spec as any) : null;
    }

    // Case 2: frets/voicing is provided as a compact string like "x32010".
    const voicing =
      (typeof o.voicing === "string" ? o.voicing : null) ??
      (typeof o.frets === "string" ? o.frets : null);
    const chordSymbol =
      (typeof o.chordSymbol === "string" ? o.chordSymbol : null) ??
      (typeof o.chord === "string" ? o.chord : null) ??
      (typeof o.symbol === "string" ? o.symbol : null) ??
      "Chord";

    if (voicing) {
      try {
        const frets = parseCompactVoicingToFrets(voicing);
        const spec = {
          type: "chord" as const,
          style: "jazz-clean-v1" as const,
          title: title ?? `${chordSymbol} (${voicing})`,
          tuning,
          frets,
        };
        return isChordSpec(spec) ? (spec as any) : null;
      } catch {
        // fallthrough
      }
    }

    // Case 3: single voicing string field but no chord symbol; still render.
    if (typeof o.value === "string") {
      try {
        return chordSpecFromVoicing({ chordSymbol, voicing: o.value, title: title ?? chordSymbol });
      } catch {
        // fallthrough
      }
    }
  }

  // Coerce fretboard specs missing style/tuning.
  if (o.type === "fretboard") {
    const spec = {
      ...o,
      style: o.style ?? "jazz-clean-v1",
      tuning: Array.isArray(o.tuning) ? o.tuning : STANDARD_TUNING,
      markers: Array.isArray(o.markers) ? o.markers : [],
    };
    return isFretboardSpec(spec) ? (spec as any) : null;
  }

  return null;
}

export function DiagramRenderer(props: { spec: unknown }) {
  const coerced = coerceDiagramSpec(props.spec);
  if (coerced && isChordSpec(coerced)) return <ChordDiagram spec={coerced} />;
  if (coerced && isFretboardSpec(coerced)) return <FretboardDiagram spec={coerced} />;

  // If we can't coerce, don't render anything (avoid noisy UI).
  return null;
}

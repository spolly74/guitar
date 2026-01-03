"use client";

import type { DiagramSpec } from "@/lib/schemas/diagram.schema";
import { isChordSpec } from "@/lib/diagrams/chordSpec";
import { isFretboardSpec } from "@/lib/diagrams/fretboardSpec";
import { ChordDiagram } from "@/app/(app)/today/ChordDiagram";
import { FretboardDiagram } from "@/app/(app)/today/FretboardDiagram";

export function DiagramRenderer(props: { spec: DiagramSpec }) {
  if (isChordSpec(props.spec)) return <ChordDiagram spec={props.spec} />;
  if (isFretboardSpec(props.spec)) return <FretboardDiagram spec={props.spec} />;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
      Unsupported diagram spec.
    </div>
  );
}

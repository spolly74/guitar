"use client";

import { useMemo } from "react";
import type { DiagramSpec } from "@/lib/schemas/v2.schema";
import { renderChordSvg } from "@/lib/diagrams/renderChordSvg";
import { renderFretboardSvg } from "@/lib/diagrams/renderFretboardSvg";
import { renderTablatureSvg } from "@/lib/diagrams/renderTablatureSvg";
import type { ChordDiagramSpec } from "@/lib/diagrams/chordSpec";
import type { FretboardDiagramSpec } from "@/lib/diagrams/fretboardSpec";
import type { TablatureSpec } from "@/lib/diagrams/tablatureSpec";

interface DiagramRendererProps {
  diagram: DiagramSpec;
  className?: string;
}

export function DiagramRenderer({ diagram, className = "" }: DiagramRendererProps) {
  const svg = useMemo(() => {
    try {
      if (diagram.type === "chord") {
        // Type assertion: schema types are structurally compatible
        return renderChordSvg(diagram as unknown as ChordDiagramSpec);
      }

      if (diagram.type === "fretboard") {
        // Type assertion: schema types are structurally compatible
        return renderFretboardSvg(diagram as unknown as FretboardDiagramSpec);
      }

      if (diagram.type === "tablature") {
        // Type assertion: schema types are structurally compatible
        return renderTablatureSvg(diagram as unknown as TablatureSpec);
      }

      return null;
    } catch (err) {
      console.error("Failed to render diagram:", err);
      return null;
    }
  }, [diagram]);

  if (!svg) {
    return (
      <div className={`rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 ${className}`}>
        Unable to render diagram
      </div>
    );
  }

  return (
    <div
      className={`overflow-x-auto rounded-lg border border-zinc-200 bg-white p-2 ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

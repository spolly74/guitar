"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChordDiagramSpec } from "@/lib/diagrams/chordSpec";

export function ChordDiagram(props: { spec: ChordDiagramSpec }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestBody = useMemo(() => JSON.stringify(props.spec), [props.spec]);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);

    (async () => {
      const res = await fetch("/api/diagram/chord", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
      });

      const payload = (await res.json().catch(() => null)) as
        | null
        | { ok: true; svg: string }
        | { ok: false; error: string };

      if (cancelled) return;

      if (!res.ok || !payload || (payload as any).ok === false) {
        setError((payload as any)?.error ?? "Failed to render chord diagram");
        return;
      }

      setSvg((payload as any).svg);
    })();

    return () => {
      cancelled = true;
    };
  }, [requestBody]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        Diagram error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
        Rendering chord diagram…
      </div>
    );
  }

  // Safe because SVG is generated server-side by us.
  return (
    <div
      className="overflow-x-auto rounded-md border border-zinc-200 bg-white"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

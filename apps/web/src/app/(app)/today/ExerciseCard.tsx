"use client";

import { useMemo, useState, useTransition } from "react";
import type { PlanBlockName, PlanExerciseItem } from "@/lib/plan/types";
import { saveExerciseLog } from "./actions";
import { isFretboardSpec, type FretboardDiagramSpec } from "@/lib/diagrams/fretboardSpec";
import { FretboardDiagram } from "./FretboardDiagram";
import { isChordSpec, type ChordDiagramSpec } from "@/lib/diagrams/chordSpec";
import { ChordDiagram } from "./ChordDiagram";
import { chordSpecFromVoicing } from "@/lib/diagrams/voicingToChordSpec";
import {
  extractChordGripsFromText,
  extractChordSymbolsFromText,
} from "@/lib/diagrams/extractChordGrips";
import { getDefaultOpenChordVoicing } from "@/lib/diagrams/openChordVoicings";

function extractChordVoicingsFromTabText(tabText: string): Array<{ chord: string; voicing: string }> {
  const lines = String(tabText ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const out: Array<{ chord: string; voicing: string }> = [];

  // Example lines:
  // Am7: x02010
  // Dm7 - xx0211
  // E7 = 020100
  const re =
    /^([A-G](?:b|#)?(?:m|maj|min|dim|aug|sus)?\d*(?:add\d+)?(?:\/[A-G](?:b|#)?)?)\s*(?::|=|-|->)\s*([x0-9]{6,24})$/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    out.push({ chord: m[1]!.trim(), voicing: m[2]!.trim() });
  }

  return out;
}

function isMostlyVoicingLines(tabText: string, extractedCount: number) {
  const lines = String(tabText ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  return extractedCount > 0 && extractedCount / lines.length >= 0.6;
}

export function ExerciseCard(props: {
  planId: string | null;
  block: PlanBlockName;
  item: PlanExerciseItem;
  initial: {
    completed: boolean;
    minutes: number;
    notes: string;
    flaggedForFollowup: boolean;
  };
}) {
  const [isPending, startTransition] = useTransition();

  const [completed, setCompleted] = useState(props.initial.completed);
  const [minutes, setMinutes] = useState(props.initial.minutes);
  const [notes, setNotes] = useState(props.initial.notes);
  const [flagged, setFlagged] = useState(props.initial.flaggedForFollowup);

  const chordDiagramsFromTab = useMemo(() => {
    const tab = String(props.item.tab_text ?? "").trim();
    if (!tab) return { diagrams: [] as ChordDiagramSpec[], hideTab: false };

    const extracted = extractChordVoicingsFromTabText(tab);
    if (extracted.length === 0) return { diagrams: [] as ChordDiagramSpec[], hideTab: false };

    const diagrams: ChordDiagramSpec[] = [];
    for (const { chord, voicing } of extracted) {
      try {
        diagrams.push(
          chordSpecFromVoicing({
            chordSymbol: chord,
            voicing,
            title: `${chord} (${voicing})`,
          }),
        );
      } catch {
        continue;
      }
    }

    return { diagrams, hideTab: diagrams.length > 0 && isMostlyVoicingLines(tab, extracted.length) };
  }, [props.item.tab_text]);

  const chordDiagramsFromInstructions = useMemo(() => {
    const text = String(props.item.instructions_md ?? "").trim();
    if (!text) return [] as ChordDiagramSpec[];

    const diagrams: ChordDiagramSpec[] = [];
    const extractedGrips = extractChordGripsFromText(text);
    for (const { chord, voicing } of extractedGrips) {
      try {
        diagrams.push(
          chordSpecFromVoicing({
            chordSymbol: chord,
            voicing,
            title: `${chord} (${voicing})`,
          }),
        );
      } catch {
        continue;
      }
    }

    // Fallback for chord lists without voicings (use deterministic open-chord shapes when available)
    if (diagrams.length === 0) {
      const chordSymbols = extractChordSymbolsFromText(text);
      for (const chord of chordSymbols) {
        const voicing = getDefaultOpenChordVoicing(chord);
        if (!voicing) continue;
        try {
          diagrams.push(
            chordSpecFromVoicing({
              chordSymbol: chord,
              voicing,
              title: `${chord} (${voicing})`,
            }),
          );
        } catch {
          continue;
        }
      }
    }
    return diagrams;
  }, [props.item.instructions_md]);

  const instructionsDebug = useMemo(() => {
    const text = String(props.item.instructions_md ?? "").trim();
    if (!text) return { grips: [] as Array<{ chord: string; voicing: string }>, symbols: [] as string[] };
    return {
      grips: extractChordGripsFromText(text),
      symbols: extractChordSymbolsFromText(text),
    };
  }, [props.item.instructions_md]);

  const mergedChordDiagramSpecs = useMemo(() => {
    const existing = Array.isArray(props.item.diagram_specs)
      ? (props.item.diagram_specs.filter(isChordSpec) as ChordDiagramSpec[])
      : [];
    const combined = [
      ...existing,
      ...chordDiagramsFromTab.diagrams,
      ...chordDiagramsFromInstructions,
    ];

    const seen = new Set<string>();
    return combined.filter((d) => {
      const key = JSON.stringify(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [
    props.item.diagram_specs,
    chordDiagramsFromTab.diagrams,
    chordDiagramsFromInstructions,
  ]);

  const hasChordDiagrams = mergedChordDiagramSpecs.length > 0;

  const headerRight = useMemo(() => {
    const parts: string[] = [];
    if (isPending) parts.push("Saving…");
    if (flagged) parts.push("Follow-up");
    return parts.join(" · ");
  }, [flagged, isPending]);

  function persist(next: {
    completed: boolean;
    minutes: number;
    notes: string;
    flaggedForFollowup: boolean;
  }) {
    startTransition(async () => {
      await saveExerciseLog({
        planId: props.planId,
        block: props.block,
        exerciseSlug: props.item.exercise_slug,
        name: props.item.name,
        completed: next.completed,
        minutes: next.minutes,
        notes: next.notes,
        flaggedForFollowup: next.flaggedForFollowup,
      });
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <input
            aria-label="Mark complete"
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={completed}
            onChange={(e) => {
              const next = e.target.checked;
              setCompleted(next);
              persist({
                completed: next,
                minutes,
                notes,
                flaggedForFollowup: flagged,
              });
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-base font-medium">{props.item.name}</div>
            <div className="mt-1 text-xs text-zinc-500">
              {props.item.exercise_slug}
            </div>
            {/* Debug: helps confirm parsing is working when users report missing diagrams */}
            {process.env.NODE_ENV !== "production" ? (
              <div className="mt-1 text-[11px] text-zinc-400">
                diagrams: {mergedChordDiagramSpecs.length} chord,{" "}
                {Array.isArray(props.item.diagram_specs)
                  ? props.item.diagram_specs.filter(isFretboardSpec).length
                  : 0}{" "}
                fretboard
                {" · "}
                instr: {instructionsDebug.grips.length} grips /{" "}
                {instructionsDebug.symbols.length} symbols
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {headerRight ? (
            <div className="text-xs text-zinc-500">{headerRight}</div>
          ) : null}
          <button
            type="button"
            className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium ${
              flagged
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
            }`}
            onClick={() => {
              const next = !flagged;
              setFlagged(next);
              persist({
                completed,
                minutes,
                notes,
                flaggedForFollowup: next,
              });
            }}
          >
            {flagged ? "Flagged" : "Flag for follow-up"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-1">
          <span className="text-sm font-medium text-zinc-700">Minutes</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            type="number"
            min={0}
            step={1}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            onBlur={() =>
              persist({
                completed,
                minutes,
                notes,
                flaggedForFollowup: flagged,
              })
            }
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Notes</span>
          <textarea
            className="min-h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none ring-zinc-900/10 focus:ring-4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() =>
              persist({
                completed,
                minutes,
                notes,
                flaggedForFollowup: flagged,
              })
            }
            placeholder="What felt hard? What improved?"
          />
        </label>
      </div>

      {props.item.instructions_md ? (
        <div className="mt-4">
          <div className="text-sm font-medium text-zinc-700">How to practice</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
            {props.item.instructions_md}
          </div>
        </div>
      ) : null}

      {Array.isArray(props.item.diagram_specs) &&
      props.item.diagram_specs.some(isFretboardSpec) ? (
        <div className="mt-4">
          <div className="text-sm font-medium text-zinc-700">Diagram</div>
          <div className="mt-1 flex flex-col gap-3">
            {props.item.diagram_specs
              .filter(isFretboardSpec)
              .map((spec, idx) => (
                <FretboardDiagram key={idx} spec={spec as FretboardDiagramSpec} />
              ))}
          </div>
        </div>
      ) : null}

      {hasChordDiagrams ? (
        <div className="mt-4">
          <div className="text-sm font-medium text-zinc-700">Chord shapes</div>
          <div className="mt-1 flex flex-wrap gap-3">
            {mergedChordDiagramSpecs.map((spec, idx) => (
              <ChordDiagram key={idx} spec={spec} />
            ))}
          </div>
        </div>
      ) : null}

      {props.item.tab_text && !chordDiagramsFromTab.hideTab ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">
            Tab (optional)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-5">
            {props.item.tab_text}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

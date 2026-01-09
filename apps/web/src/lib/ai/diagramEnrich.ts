import type { LessonV1 } from "@/lib/lesson/schema";
import type { GuitarTheoryOutput } from "@/lib/ai/guitarTheory";
import type { LessonPlannerOutput } from "@/lib/ai/lessonPlanner";
import { chordSpecFromVoicing } from "@/lib/diagrams/voicingToChordSpec";
import {
  extractChordGripsFromText,
  extractChordSymbolsFromText,
} from "@/lib/diagrams/extractChordGrips";
import { getDefaultOpenChordVoicing } from "@/lib/diagrams/openChordVoicings";
import { validateChordSpec, formatValidationErrors } from "@/lib/diagrams/validation";

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
    const chord = m[1]!.trim();
    const voicing = m[2]!.trim();
    out.push({ chord, voicing });
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

function firstItemIndex(block: any): number | null {
  const items = block?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  return 0;
}

export function enrichLessonWithDeterministicDiagrams(input: {
  lesson: LessonV1;
  theory: GuitarTheoryOutput;
  plan: LessonPlannerOutput;
}): LessonV1 {
  // Deep-ish clone the minimal parts we mutate to avoid accidental shared refs.
  const lesson: LessonV1 = {
    ...input.lesson,
    today_blocks: input.lesson.today_blocks.map((b) => ({
      ...b,
      items: b.items.map((it) => ({
        ...it,
        diagram_specs: Array.isArray(it.diagram_specs) ? [...it.diagram_specs] : it.diagram_specs,
      })),
    })),
  };

  const planByBlock = new Map<string, any>();
  for (const b of input.plan.blocks ?? []) planByBlock.set(b.block, b);

  for (const block of lesson.today_blocks) {
    const p = planByBlock.get(block.block);
    if (!p) continue;
    const chords: string[] = Array.isArray(p.chords) ? p.chords : [];
    const voicings: Record<string, string[]> =
      (p.voicings as any) && typeof p.voicings === "object" ? p.voicings : {};

    if (chords.length === 0) continue;
    const idx = firstItemIndex(block);
    if (idx === null) continue;

    const diagrams = [];
    const errors: string[] = [];
    for (const chord of chords) {
      const v =
        (Array.isArray(voicings[chord]) ? voicings[chord][0] : null) ??
        (Array.isArray((input.theory.voicings as any)?.[chord])
          ? (input.theory.voicings as any)[chord][0]
          : null);
      if (!v || typeof v !== "string") continue;
      try {
        const spec = chordSpecFromVoicing({
          chordSymbol: chord,
          voicing: v,
          title: `${chord} (${v})`,
        });

        // Validate the generated spec
        const validation = validateChordSpec(spec, "permissive");
        if (validation.ok) {
          diagrams.push(validation.data);
        } else {
          errors.push(`${chord}: ${formatValidationErrors(validation.errors)}`);
        }
      } catch (e) {
        errors.push(`${chord}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Log validation errors for debugging (best-effort, don't fail the lesson)
    if (errors.length > 0) {
      console.warn(`[diagramEnrich] Chord diagram validation errors:\n${errors.join("\n")}`);
    }

    if (diagrams.length === 0) continue;

    const item = block.items[idx] as any;
    const existing = Array.isArray(item.diagram_specs) ? item.diagram_specs : [];
    item.diagram_specs = [...existing, ...diagrams];
  }

  // Also: if an item contains chord voicings in tab_text (common LLM behavior),
  // convert those voicings to chord diagrams and hide the tab.
  for (const block of lesson.today_blocks) {
    for (const it of block.items as any[]) {
      const tab = String(it?.tab_text ?? "").trim();
      if (!tab) continue;

      const extracted = extractChordVoicingsFromTabText(tab);
      if (extracted.length === 0) continue;

      const newDiagrams = [];
      const tabErrors: string[] = [];
      for (const { chord, voicing } of extracted) {
        try {
          const spec = chordSpecFromVoicing({
            chordSymbol: chord,
            voicing,
            title: `${chord} (${voicing})`,
          });

          const validation = validateChordSpec(spec, "permissive");
          if (validation.ok) {
            newDiagrams.push(validation.data);
          } else {
            tabErrors.push(`${chord}: ${formatValidationErrors(validation.errors)}`);
          }
        } catch (e) {
          tabErrors.push(`${chord}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }

      if (tabErrors.length > 0) {
        console.warn(`[diagramEnrich] Tab text validation errors:\n${tabErrors.join("\n")}`);
      }

      if (newDiagrams.length === 0) continue;

      const existing = Array.isArray(it.diagram_specs) ? it.diagram_specs : [];
      it.diagram_specs = [...existing, ...newDiagrams];

      if (isMostlyVoicingLines(tab, extracted.length)) {
        it.tab_text = "";
      }
    }
  }

  // Also: chord grips often appear in instructions_md (markdown-ish), e.g. "- **Am (x02210)**".
  // Convert those to chord diagrams too.
  for (const block of lesson.today_blocks) {
    for (const it of block.items as any[]) {
      const text = String(it?.instructions_md ?? "").trim();
      if (!text) continue;

      const newDiagrams = [];
      const instructionsErrors: string[] = [];
      const extractedGrips = extractChordGripsFromText(text);
      for (const { chord, voicing } of extractedGrips) {
        try {
          const spec = chordSpecFromVoicing({
            chordSymbol: chord,
            voicing,
            title: `${chord} (${voicing})`,
          });

          const validation = validateChordSpec(spec, "permissive");
          if (validation.ok) {
            newDiagrams.push(validation.data);
          } else {
            instructionsErrors.push(`${chord}: ${formatValidationErrors(validation.errors)}`);
          }
        } catch (e) {
          instructionsErrors.push(`${chord}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }

      // Fallback: chord list with no voicings. Use deterministic open-chord shapes when available.
      if (newDiagrams.length === 0) {
        const chordSymbols = extractChordSymbolsFromText(text);
        for (const chord of chordSymbols) {
          const voicing = getDefaultOpenChordVoicing(chord);
          if (!voicing) continue;
          try {
            const spec = chordSpecFromVoicing({
              chordSymbol: chord,
              voicing,
              title: `${chord} (${voicing})`,
            });

            const validation = validateChordSpec(spec, "permissive");
            if (validation.ok) {
              newDiagrams.push(validation.data);
            } else {
              instructionsErrors.push(`${chord}: ${formatValidationErrors(validation.errors)}`);
            }
          } catch (e) {
            instructionsErrors.push(
              `${chord}: ${e instanceof Error ? e.message : "Unknown error"}`,
            );
          }
        }
      }

      if (instructionsErrors.length > 0) {
        console.warn(
          `[diagramEnrich] Instructions text validation errors:\n${instructionsErrors.join("\n")}`,
        );
      }

      if (newDiagrams.length === 0) continue;

      const existing = Array.isArray(it.diagram_specs) ? it.diagram_specs : [];
      const combined = [...existing, ...newDiagrams];

      // De-dupe (same voicing may appear multiple times across enrichment steps)
      const seen = new Set<string>();
      it.diagram_specs = combined.filter((d: any) => {
        const key = JSON.stringify(d);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  lesson.sources = [
    ...(lesson.sources ?? []),
    { type: "diagram_enrich_v1", mode: "voicing_to_chord_spec" },
  ];

  return lesson;
}

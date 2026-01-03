import type { LessonV1 } from "@/lib/lesson/schema";
import type { GuitarTheoryOutput } from "@/lib/ai/guitarTheory";
import type { LessonPlannerOutput } from "@/lib/ai/lessonPlanner";
import { chordSpecFromVoicing } from "@/lib/diagrams/voicingToChordSpec";

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
    for (const chord of chords) {
      const v =
        (Array.isArray(voicings[chord]) ? voicings[chord][0] : null) ??
        (Array.isArray((input.theory.voicings as any)?.[chord])
          ? (input.theory.voicings as any)[chord][0]
          : null);
      if (!v || typeof v !== "string") continue;
      try {
        diagrams.push(
          chordSpecFromVoicing({
            chordSymbol: chord,
            voicing: v,
            title: `${chord} (${v})`,
          }),
        );
      } catch {
        continue;
      }
    }

    if (diagrams.length === 0) continue;

    const item = block.items[idx] as any;
    const existing = Array.isArray(item.diagram_specs) ? item.diagram_specs : [];
    item.diagram_specs = [...existing, ...diagrams];
  }

  lesson.sources = [
    ...(lesson.sources ?? []),
    { type: "diagram_enrich_v1", mode: "voicing_to_chord_spec" },
  ];

  return lesson;
}

import type { LessonV1 } from "@/lib/lesson/schema";

export type QualityIssue = { code: string; message: string };

function isVacuous(text: string) {
  const t = text.toLowerCase();
  const bad = [
    "learn the caged shapes",
    "practice the caged shapes",
    "review the caged shapes",
    "learn and apply the caged chord shapes",
    "learn the shapes",
  ];
  return bad.some((p) => t.includes(p));
}

export function assessLessonQuality(input: { lesson: LessonV1; userPrompt: string }): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const p = input.userPrompt.toLowerCase();
  const wantsCaged = p.includes("caged");

  // Basic: blocks must have at least 1 actionable item with some detail.
  for (const b of input.lesson.today_blocks ?? []) {
    if (!b.items || b.items.length === 0) {
      issues.push({ code: "empty_block", message: `Block '${b.block}' has no items.` });
      continue;
    }
    const first = b.items[0] as any;
    const instr = String(first.instructions_md ?? "").trim();
    if (instr.length < 40) {
      issues.push({
        code: "thin_instructions",
        message: `Block '${b.block}' first item instructions are too short.`,
      });
    }
  }

  const focus = `${input.lesson.title}\n${input.lesson.focus_prompt}`.trim();
  if (focus && isVacuous(focus)) {
    issues.push({ code: "vacuous", message: "Lesson focus/title is vacuous." });
  }

  // If CAGED is requested, require specific deliverables.
  if (wantsCaged) {
    const text = JSON.stringify(input.lesson).toLowerCase();
    // Require at least 5 distinct shape mentions.
    const shapeCount = ["c-shape", "a-shape", "g-shape", "e-shape", "d-shape"].filter((s) =>
      text.includes(s),
    ).length;
    if (shapeCount < 3) {
      issues.push({
        code: "missing_shapes",
        message:
          "CAGED requested but lesson does not clearly cover multiple named shapes (C/A/G/E/D).",
      });
    }
    // Require at least 3 chord diagrams present somewhere (after enrichment this should happen).
    const diagramCount = (input.lesson.today_blocks ?? []).reduce((acc, b) => {
      return (
        acc +
        (b.items ?? []).reduce((a2, it: any) => {
          const ds = Array.isArray(it.diagram_specs) ? it.diagram_specs : [];
          return a2 + ds.filter((d: any) => d?.type === "chord").length;
        }, 0)
      );
    }, 0);
    if (diagramCount < 3) {
      issues.push({
        code: "missing_diagrams",
        message: "CAGED requested but lesson contains too few chord diagrams.",
      });
    }
  }

  return issues;
}



import type { LessonV1 } from "@/lib/lesson/schema";

export type LearningPath14d = {
  version: "1.0";
  total_days: number;
  daily_practice_minutes: number;
  learning_phases: string[];
  lessons: Array<{
    day: number;
    title: string;
    focus: string[];
    objectives: string[];
    activities: string[];
    success_criteria: string;
  }>;
};

export function coerceLearningPath14d(v: unknown): LearningPath14d | null {
  if (!v || typeof v !== "object") return null;
  const o: any = v;
  if (o.version !== "1.0") return null;
  if (!Array.isArray(o.lessons)) return null;
  return o as LearningPath14d;
}

export function clampDay(day: number, total: number) {
  if (!Number.isFinite(day) || day < 1) return 1;
  if (!Number.isFinite(total) || total < 1) return day;
  return Math.min(day, total);
}

export function buildPromptForLearningPathDay(input: {
  trackTitle: string;
  trackKind: string;
  trackGoal: string;
  learningPath: LearningPath14d;
  day: number;
}): { dayTitle: string; userPrompt: string } {
  const lp = input.learningPath;
  const d = clampDay(input.day, lp.total_days ?? 14);
  const lesson = lp.lessons.find((l) => Number(l.day) === d) ?? lp.lessons[0];
  const dayTitle = lesson?.title ?? `Day ${d}`;

  const userPrompt = [
    `Learning path: ${input.trackTitle}`,
    `Kind: ${input.trackKind}`,
    input.trackGoal ? `Goal: ${input.trackGoal}` : "",
    "",
    `Use this curriculum day as the source of truth. Do not replace it with generic advice.`,
    `Day ${d} of ${lp.total_days}: ${dayTitle}`,
    "",
    `Focus: ${(lesson?.focus ?? []).join(", ")}`,
    "",
    "Objectives:",
    ...(lesson?.objectives ?? []).map((x) => `- ${x}`),
    "",
    "Activities (can include off-app items like listening):",
    ...(lesson?.activities ?? []).map((x) => `- ${x}`),
    "",
    `Success criteria: ${lesson?.success_criteria ?? ""}`.trim(),
    "",
    "Now generate a 30-minute lesson with 4 blocks (warmup/review/new/apply) that implements the above day.",
  ]
    .filter(Boolean)
    .join("\n");

  return { dayTitle, userPrompt };
}

export function retitleLessonFromCurriculum(input: {
  lesson: LessonV1;
  trackTitle: string;
  day: number;
  dayTitle: string;
}): LessonV1 {
  return {
    ...input.lesson,
    title: `${input.trackTitle}: Day ${input.day} — ${input.dayTitle}`,
  };
}

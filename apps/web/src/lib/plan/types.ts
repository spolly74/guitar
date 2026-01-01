export type PlanBlockName = "warmup" | "review" | "new" | "apply";

export type PlanExerciseItem = {
  exercise_slug: string;
  name: string;
  minutes: number;
  instructions_md?: string;
  tab_text?: string;
  diagram_specs?: unknown[];
  concept_tags?: string[];
  common_mistakes?: string[];
  success_criteria?: string[];
};

export type PlanTodayBlock = {
  block: PlanBlockName;
  minutes: number;
  items: PlanExerciseItem[];
};

export type PlanV1 = {
  version: "1.0";
  date: string;
  title: string;
  focus_prompt: string;
  assumptions?: {
    level: "beginner";
    daily_minutes_target: number;
    instrument: string;
    tuning: string;
  };
  today_blocks: PlanTodayBlock[];
  review_logic?: {
    include_open_followups: boolean;
    prefer_recent_days: number;
  };
  sources?: unknown[];
};

export function coercePlanV1(planJson: unknown): PlanV1 | null {
  if (!planJson || typeof planJson !== "object") return null;
  const p = planJson as Partial<PlanV1>;
  if (p.version !== "1.0") return null;
  if (!Array.isArray(p.today_blocks)) return null;
  return p as PlanV1;
}

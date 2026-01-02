import { z } from "zod";

export const PlanBlockNameSchema = z.enum(["warmup", "review", "new", "apply"]);

export const PlanExerciseItemSchema = z
  .object({
    exercise_slug: z.string().min(1),
    name: z.string().min(1),
    minutes: z.number().int().nonnegative(),
    instructions_md: z.string().optional(),
    tab_text: z.string().optional(),
    diagram_specs: z.array(z.unknown()).optional(),
    concept_tags: z.array(z.string()).optional(),
    common_mistakes: z.array(z.string()).optional(),
    success_criteria: z.array(z.string()).optional(),
  })
  .strict();

export const PlanTodayBlockSchema = z
  .object({
    block: PlanBlockNameSchema,
    minutes: z.number().int().nonnegative(),
    items: z.array(PlanExerciseItemSchema),
  })
  .strict();

export const PlanV1Schema = z
  .object({
    version: z.literal("1.0"),
    date: z.string().min(10),
    title: z.string(),
    focus_prompt: z.string(),
    assumptions: z
      .object({
        level: z.literal("beginner"),
        daily_minutes_target: z.number().int().positive(),
        instrument: z.string(),
        tuning: z.string(),
      })
      .strict()
      .optional(),
    today_blocks: z.array(PlanTodayBlockSchema),
    review_logic: z
      .object({
        include_open_followups: z.boolean(),
        prefer_recent_days: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
    sources: z.array(z.unknown()).optional(),
  })
  .strict();

export type PlanV1 = z.infer<typeof PlanV1Schema>;

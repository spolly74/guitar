import { z } from "zod";
import { shouldApplyJazzDefault } from "@/lib/ai/styleDetect";
import { loadAiTextAsset } from "@/lib/ai/assets";
import { openAiJsonChat, plannerModel } from "@/lib/openai/jsonChat";
import { requiredEnv } from "@/lib/server/requiredEnv";

import type { GuitarTheoryOutput } from "@/lib/ai/guitarTheory";

const BlockNameSchema = z.enum(["warmup", "review", "new", "apply"]);

const PlannerBlockSchema = z
  .object({
    block: BlockNameSchema,
    minutes: z.number().int().min(0).max(60),
    focus: z.string().min(1),
    chords: z.array(z.string().min(1)).default([]),
    voicings: z.record(z.string(), z.array(z.string().min(1)).min(1).max(8)).default({}),
  })
  .strict();

export const LessonPlannerOutputSchema = z
  .object({
    minutes_total: z.number().int().min(30).max(180),
    blocks: z.array(PlannerBlockSchema).length(4),
    notes: z.array(z.string().min(1)).default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    const names = v.blocks.map((b) => b.block);
    const required: Array<z.infer<typeof BlockNameSchema>> = [
      "warmup",
      "review",
      "new",
      "apply",
    ];
    for (const r of required) {
      if (!names.includes(r)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks"],
          message: `Missing required block: ${r}`,
        });
      }
    }
    const sum = v.blocks.reduce((acc, b) => acc + (b.minutes ?? 0), 0);
    if (sum < 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blocks"],
        message: `Total minutes too low (${sum}); must be >= 30`,
      });
    }
  });

export type LessonPlannerOutput = z.infer<typeof LessonPlannerOutputSchema>;

async function loadSystemPrompt(): Promise<string> {
  return await loadAiTextAsset("ai/agents/lesson-planner.prompt.md");
}

async function loadJazzPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/jazz_path.md");
}

async function loadPromptDrivenPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/prompt_driven.md");
}

export async function runLessonPlannerAgent(input: {
  user_prompt: string;
  orchestrator_goal: string;
  theory: GuitarTheoryOutput;
  minutes_total?: number;
  retrieval_context?: string;
}): Promise<LessonPlannerOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();
  const [baseSystem, promptPolicy] = await Promise.all([loadSystemPrompt(), loadPromptDrivenPolicy()]);
  const jazzPolicy = shouldApplyJazzDefault(input.user_prompt) ? await loadJazzPolicy() : "";
  const system = [baseSystem, promptPolicy, jazzPolicy].filter(Boolean).join("\n\n");

  const user = {
    user_prompt: input.user_prompt,
    goal: input.orchestrator_goal,
    minutes_total: input.minutes_total ?? 30,
    theory_json: input.theory,
    retrieval_context: input.retrieval_context ?? "",
    output_schema: {
      minutes_total: 30,
      blocks: [
        { block: "warmup|review|new|apply", minutes: 5, focus: "string", chords: [], voicings: {} },
      ],
      notes: ["string"],
    },
  };

  const parsed = await openAiJsonChat({ apiKey, model, temperature: 0.1, system, user });

  const first = LessonPlannerOutputSchema.safeParse(parsed);
  if (first.success) return first.data;

  const parsed2 = await openAiJsonChat({
    apiKey,
    model,
    temperature: 0.1,
    system,
    user: {
      ...user,
      correction:
        "Your previous JSON did not validate. Fix it and output ONLY valid JSON with the exact shape and required blocks.",
      issues: first.error.issues,
    },
  });

  return LessonPlannerOutputSchema.parse(parsed2);
}

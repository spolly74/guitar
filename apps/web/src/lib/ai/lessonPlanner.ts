import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { GuitarTheoryOutput } from "@/lib/ai/guitarTheory";

const BlockNameSchema = z.enum(["warmup", "review", "new", "apply"]);

const PlannerBlockSchema = z
  .object({
    block: BlockNameSchema,
    minutes: z.number().int().min(0).max(60),
    focus: z.string().min(1),
    chords: z.array(z.string().min(1)).default([]),
    voicings: z.record(z.string(), z.array(z.string().min(1)).min(1).max(3)).default({}),
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

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function openAiJson(input: {
  apiKey: string;
  model: string;
  temperature: number;
  system: string;
  user: unknown;
}): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      temperature: input.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: JSON.stringify(input.user) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI lesson-planner failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI lesson-planner returned no content");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI lesson-planner returned non-JSON content");
  }
}

async function loadSystemPrompt(): Promise<string> {
  const p = join(process.cwd(), "src", "ai", "agents", "lesson-planner.prompt.md");
  return await readFile(p, "utf8");
}

export async function runLessonPlannerAgent(input: {
  user_prompt: string;
  orchestrator_goal: string;
  theory: GuitarTheoryOutput;
  minutes_total?: number;
  retrieval_context?: string;
}): Promise<LessonPlannerOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";
  const system = await loadSystemPrompt();

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

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.1,
    system,
    user,
  });

  const first = LessonPlannerOutputSchema.safeParse(parsed);
  if (first.success) return first.data;

  const parsed2 = await openAiJson({
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

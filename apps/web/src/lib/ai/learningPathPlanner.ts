import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const LearningPath14dSchema = z
  .object({
    version: z.literal("1.0"),
    total_days: z.number().int().min(7).max(30).default(14),
    daily_practice_minutes: z.number().int().min(10).max(180).default(30),
    learning_phases: z.array(z.string().min(1)).min(2).max(10),
    lessons: z
      .array(
        z
          .object({
            day: z.number().int().min(1).max(30),
            title: z.string().min(1),
            focus: z.array(z.string().min(1)).min(1).max(8),
            objectives: z.array(z.string().min(1)).min(2).max(8),
            activities: z.array(z.string().min(1)).min(3).max(12),
            success_criteria: z.string().min(1),
          })
          .strict(),
      )
      .min(7)
      .max(30),
  })
  .strict()
  .superRefine((v, ctx) => {
    const days = new Set(v.lessons.map((l) => l.day));
    if (days.size !== v.lessons.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lessons"],
        message: "Duplicate day numbers in lessons.",
      });
    }
    if (v.lessons.length < v.total_days) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lessons"],
        message: `Expected at least ${v.total_days} lessons, got ${v.lessons.length}.`,
      });
    }
  });

export type LearningPath14d = z.infer<typeof LearningPath14dSchema>;

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
    throw new Error(`OpenAI learning-path-planner failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("OpenAI learning-path-planner returned no content");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI learning-path-planner returned non-JSON content");
  }
}

async function loadSystemPrompt(): Promise<string> {
  const p = join(process.cwd(), "src", "ai", "agents", "learning-path-planner.prompt.md");
  return await readFile(p, "utf8");
}

export async function runLearningPathPlannerAgent(input: {
  user_prompt: string;
  total_days?: number;
  daily_minutes?: number;
  evidence_context: string;
  theory_json?: unknown;
  orchestrator_goal?: string;
}): Promise<LearningPath14d> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";
  const system = await loadSystemPrompt();

  const user = {
    user_prompt: input.user_prompt,
    goal: input.orchestrator_goal ?? "",
    total_days: input.total_days ?? 14,
    daily_practice_minutes: input.daily_minutes ?? 30,
    evidence_context: input.evidence_context,
    theory_json: input.theory_json ?? {},
    output_schema: {
      version: "1.0",
      total_days: 14,
      daily_practice_minutes: 30,
      learning_phases: ["string"],
      lessons: [
        {
          day: 1,
          title: "string",
          focus: ["string"],
          objectives: ["string"],
          activities: ["string"],
          success_criteria: "string",
        },
      ],
    },
  };

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user,
  });

  const first = LearningPath14dSchema.safeParse(parsed);
  if (first.success) return first.data;

  const parsed2 = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user: { ...user, correction: "Fix validation issues and output ONLY valid JSON.", issues: first.error.issues },
  });

  return LearningPath14dSchema.parse(parsed2);
}

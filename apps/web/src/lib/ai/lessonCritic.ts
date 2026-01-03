import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { LessonV1 } from "@/lib/lesson/schema";

export const LessonCriticOutputSchema = z
  .object({
    ok: z.boolean(),
    issues: z.array(z.string().min(1)).default([]),
    fix_instructions: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type LessonCriticOutput = z.infer<typeof LessonCriticOutputSchema>;

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
    throw new Error(`OpenAI lesson critic failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("OpenAI lesson critic returned no content");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI lesson critic returned non-JSON content");
  }
}

async function loadSystemPrompt(): Promise<string> {
  const p = join(process.cwd(), "src", "ai", "agents", "lesson-critic.prompt.md");
  return await readFile(p, "utf8");
}

export async function runLessonCritic(input: {
  user_prompt: string;
  evidence_context: string;
  lesson: LessonV1;
}): Promise<LessonCriticOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";
  const system = await loadSystemPrompt();

  const user = {
    user_prompt: input.user_prompt,
    evidence_context: input.evidence_context,
    lesson_json: input.lesson,
    output_schema: { ok: true, issues: ["string"], fix_instructions: ["string"] },
  };

  const parsed = await openAiJson({ apiKey, model, temperature: 0.1, system, user });
  const first = LessonCriticOutputSchema.safeParse(parsed);
  if (first.success) return first.data;

  const parsed2 = await openAiJson({
    apiKey,
    model,
    temperature: 0.1,
    system,
    user: { ...user, correction: "Fix validation issues and output ONLY valid JSON.", issues: first.error.issues },
  });
  return LessonCriticOutputSchema.parse(parsed2);
}

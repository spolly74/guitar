import { z } from "zod";
import type { LessonV1 } from "@/lib/lesson/schema";
import { loadAiTextAsset } from "@/lib/ai/assets";
import { openAiJsonChat, plannerModel } from "@/lib/openai/jsonChat";
import { requiredEnv } from "@/lib/server/requiredEnv";

export const LessonCriticOutputSchema = z
  .object({
    ok: z.boolean(),
    issues: z.array(z.string().min(1)).default([]),
    fix_instructions: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type LessonCriticOutput = z.infer<typeof LessonCriticOutputSchema>;

async function loadSystemPrompt(): Promise<string> {
  return await loadAiTextAsset("ai/agents/lesson-critic.prompt.md");
}

export async function runLessonCritic(input: {
  user_prompt: string;
  evidence_context: string;
  lesson: LessonV1;
}): Promise<LessonCriticOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();
  const system = await loadSystemPrompt();

  const user = {
    user_prompt: input.user_prompt,
    evidence_context: input.evidence_context,
    lesson_json: input.lesson,
    output_schema: { ok: true, issues: ["string"], fix_instructions: ["string"] },
  };

  const parsed = await openAiJsonChat({ apiKey, model, temperature: 0.1, system, user });
  const first = LessonCriticOutputSchema.safeParse(parsed);
  if (first.success) return first.data;

  const parsed2 = await openAiJsonChat({
    apiKey,
    model,
    temperature: 0.1,
    system,
    user: {
      ...user,
      correction: "Fix validation issues and output ONLY valid JSON.",
      issues: first.error.issues,
    },
  });
  return LessonCriticOutputSchema.parse(parsed2);
}

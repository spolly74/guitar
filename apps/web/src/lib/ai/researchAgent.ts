import { z } from "zod";
import { loadAiTextAsset } from "@/lib/ai/assets";
import { openAiJsonChat, plannerModel } from "@/lib/openai/jsonChat";
import { requiredEnv } from "@/lib/server/requiredEnv";

export const ResearchOutputSchema = z
  .object({
    queries: z.array(z.string().min(1)).min(1).max(5),
    must_have: z.array(z.string().min(1)).default([]),
    preferred_source_kinds: z
      .array(z.enum(["lesson", "chord chart", "tutorial", "reference"]))
      .default(["tutorial", "reference"]),
    notes: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

async function loadSystemPrompt(): Promise<string> {
  return await loadAiTextAsset("ai/agents/research.prompt.md");
}

export async function runResearchAgent(input: { user_prompt: string }): Promise<ResearchOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();
  const system = await loadSystemPrompt();

  const user = {
    user_prompt: input.user_prompt,
    output_schema: {
      queries: ["string"],
      must_have: ["string"],
      preferred_source_kinds: ["lesson|chord chart|tutorial|reference"],
      notes: ["string"],
    },
  };

  const parsed = await openAiJsonChat({ apiKey, model, temperature: 0.1, system, user });

  const first = ResearchOutputSchema.safeParse(parsed);
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

  return ResearchOutputSchema.parse(parsed2);
}

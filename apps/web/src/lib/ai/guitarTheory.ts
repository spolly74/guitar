import { z } from "zod";
import { shouldApplyJazzDefault } from "@/lib/ai/styleDetect";
import { loadAiTextAsset } from "@/lib/ai/assets";
import { openAiJsonChat, plannerModel } from "@/lib/openai/jsonChat";
import { requiredEnv } from "@/lib/server/requiredEnv";

const VoicingStringSchema = z
  .string()
  .min(6)
  .max(24)
  .regex(/^[x0-9]+$/i, "Voicing must be a compact tab string like x5x56x")
  .refine((s) => s.toLowerCase().includes("x") || s.includes("0") || /[1-9]/.test(s), {
    message: "Voicing must include at least one fret/open/mute value",
  });

export const GuitarTheoryOutputSchema = z
  .object({
    chords: z.array(z.string().min(1)).min(1).max(16),
    progressions: z
      .array(
        z
          .object({
            name: z.string().min(1),
            chords: z.array(z.string().min(1)).min(2).max(16),
          })
          .strict(),
      )
      .default([]),
    voicings: z.record(z.string(), z.array(VoicingStringSchema).min(1).max(8)).default({}),
    notes: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type GuitarTheoryOutput = z.infer<typeof GuitarTheoryOutputSchema>;

async function loadSystemPrompt(): Promise<string> {
  return await loadAiTextAsset("ai/agents/guitar-theory.prompt.md");
}

async function loadJazzPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/jazz_path.md");
}

async function loadPromptDrivenPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/prompt_driven.md");
}

export async function runGuitarTheoryAgent(input: {
  user_prompt: string;
  orchestrator_goal?: string;
  retrieval_context?: string;
}): Promise<GuitarTheoryOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();
  const [baseSystem, promptPolicy] = await Promise.all([loadSystemPrompt(), loadPromptDrivenPolicy()]);
  const jazzPolicy = shouldApplyJazzDefault(input.user_prompt) ? await loadJazzPolicy() : "";
  const system = [baseSystem, promptPolicy, jazzPolicy].filter(Boolean).join("\n\n");

  const user = {
    user_prompt: input.user_prompt,
    goal: input.orchestrator_goal ?? "",
    retrieval_context: input.retrieval_context ?? "",
    output_schema: {
      chords: ["string"],
      progressions: [{ name: "string", chords: ["string"] }],
      voicings: { "ChordSymbol": ["x5x56x"] },
      notes: ["string"],
    },
  };

  const parsed = await openAiJsonChat({ apiKey, model, temperature: 0.1, system, user });

  const first = GuitarTheoryOutputSchema.safeParse(parsed);
  if (first.success) return first.data;

  const parsed2 = await openAiJsonChat({
    apiKey,
    model,
    temperature: 0.1,
    system,
    user: {
      ...user,
      correction:
        "Your previous JSON did not validate. Fix it and output ONLY valid JSON with the exact shape.",
      issues: first.error.issues,
    },
  });

  return GuitarTheoryOutputSchema.parse(parsed2);
}

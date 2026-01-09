import { z } from "zod";
import { shouldApplyJazzDefault } from "@/lib/ai/styleDetect";
import { loadAiTextAsset } from "@/lib/ai/assets";
import { openAiJsonChat, plannerModel } from "@/lib/openai/jsonChat";
import { requiredEnv } from "@/lib/server/requiredEnv";

const OrchestratorOutputSchema = z
  .object({
    goal: z.string().min(1),
    tasks: z.array(z.string().min(1)).min(1).max(10),
    constraints: z
      .object({
        minutes_total: z.number().int().min(30).max(180),
        must_include_blocks: z
          .array(z.enum(["warmup", "review", "new", "apply"]))
          .min(4)
          .max(4),
      })
      .strict(),
    lesson_prompt: z.string().min(1),
  })
  .strict();

export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

async function loadOrchestratorSystemPrompt(): Promise<string> {
  return await loadAiTextAsset("ai/agents/orchestrator.prompt.md");
}

async function loadJazzPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/jazz_path.md");
}

async function loadPromptDrivenPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/prompt_driven.md");
}

export async function runOrchestrator(input: {
  user_prompt: string;
  minutes_total?: number;
  retrieval_context?: string;
}): Promise<OrchestratorOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();
  const [baseSystem, promptPolicy] = await Promise.all([
    loadOrchestratorSystemPrompt(),
    loadPromptDrivenPolicy(),
  ]);
  const jazzPolicy = shouldApplyJazzDefault(input.user_prompt) ? await loadJazzPolicy() : "";
  const system = [baseSystem, promptPolicy, jazzPolicy].filter(Boolean).join("\n\n");

  const user = {
    user_prompt: input.user_prompt,
    minutes_total: input.minutes_total ?? 30,
    retrieval_context: input.retrieval_context ?? "",
    output_schema: {
      goal: "string",
      tasks: ["string"],
      constraints: {
        minutes_total: 30,
        must_include_blocks: ["warmup", "review", "new", "apply"],
      },
      lesson_prompt: "string",
    },
  };

  const parsed = await openAiJsonChat({ apiKey, model, temperature: 0.1, system, user });

  const first = OrchestratorOutputSchema.safeParse(parsed);
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

  return OrchestratorOutputSchema.parse(parsed2);
}

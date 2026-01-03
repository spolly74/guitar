import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

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
    throw new Error(`OpenAI orchestrator failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI orchestrator returned no content");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI orchestrator returned non-JSON content");
  }
}

async function loadOrchestratorSystemPrompt(): Promise<string> {
  // Keep prompts as first-class artifacts (Phase plan).
  const p = join(process.cwd(), "src", "ai", "agents", "orchestrator.prompt.md");
  return await readFile(p, "utf8");
}

export async function runOrchestrator(input: {
  user_prompt: string;
  minutes_total?: number;
  retrieval_context?: string;
}): Promise<OrchestratorOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";
  const system = await loadOrchestratorSystemPrompt();

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

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.1,
    system,
    user,
  });

  const first = OrchestratorOutputSchema.safeParse(parsed);
  if (first.success) return first.data;

  const parsed2 = await openAiJson({
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

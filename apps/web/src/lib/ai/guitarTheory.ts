import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { shouldApplyJazzDefault } from "@/lib/ai/styleDetect";

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
    throw new Error(`OpenAI guitar-theory failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI guitar-theory returned no content");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI guitar-theory returned non-JSON content");
  }
}

async function loadSystemPrompt(): Promise<string> {
  const p = join(process.cwd(), "src", "ai", "agents", "guitar-theory.prompt.md");
  return await readFile(p, "utf8");
}

async function loadJazzPolicy(): Promise<string> {
  const p = join(process.cwd(), "src", "ai", "policies", "jazz_path.md");
  return await readFile(p, "utf8");
}

async function loadPromptDrivenPolicy(): Promise<string> {
  const p = join(process.cwd(), "src", "ai", "policies", "prompt_driven.md");
  return await readFile(p, "utf8");
}

export async function runGuitarTheoryAgent(input: {
  user_prompt: string;
  orchestrator_goal?: string;
  retrieval_context?: string;
}): Promise<GuitarTheoryOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";
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

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.1,
    system,
    user,
  });

  const first = GuitarTheoryOutputSchema.safeParse(parsed);
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

  return GuitarTheoryOutputSchema.parse(parsed2);
}

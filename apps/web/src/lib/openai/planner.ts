import { z } from "zod";

const TrackWizardInputSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["program", "song", "technique", "other"]),
  goal: z.string().min(1),
  minutesPerDay: z.number().int().min(10).max(180),
});

export type TrackWizardInput = z.infer<typeof TrackWizardInputSchema>;

export const TrackWizardOutputSchema = z.object({
  curriculum: z.object({
    version: z.literal("1.0"),
    phases: z
      .array(
        z.object({
          phase: z.number().int().min(1),
          name: z.string().min(1),
          days: z.number().int().min(3).max(90),
          focus: z.string().min(1),
          notes: z.string().optional(),
        }),
      )
      .min(1),
  }),
  exercises: z
    .array(
      z.object({
        exercise_slug: z.string().min(1),
        name: z.string().min(1),
        block: z.enum(["warmup", "review", "new", "apply"]),
        minutes_default: z.number().int().min(1).max(30),
        difficulty: z.enum(["beginner", "easy", "medium", "hard"]).default("beginner"),
        tags: z.array(z.string()).default([]),
        instructions_md: z.string().default(""),
        tab_text: z.string().default(""),
        diagram_specs: z.array(z.unknown()).default([]),
      }),
    )
    .min(6),
});

export type TrackWizardOutput = z.infer<typeof TrackWizardOutputSchema>;

const AdHocWizardInputSchema = z.object({
  prompt: z.string().min(1),
  minutes: z.number().int().min(10).max(180),
});

export type AdHocWizardInput = z.infer<typeof AdHocWizardInputSchema>;

export const AdHocWizardOutputSchema = z.object({
  title: z.string().min(1),
  focus_prompt: z.string().min(1),
});

export type AdHocWizardOutput = z.infer<typeof AdHocWizardOutputSchema>;

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function runTrackWizard(input: TrackWizardInput): Promise<TrackWizardOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";

  const validated = TrackWizardInputSchema.parse(input);

  const system = [
    "You design structured guitar practice curricula.",
    "Rules:",
    "- No standard music notation. Use chord symbols, tablature, and plain text only.",
    "- Keep it beginner-friendly and practice-first.",
    "- Output STRICT JSON only matching the requested schema.",
    "- Include enough exercises to generate daily plans with 4 blocks: warmup/review/new/apply.",
  ].join("\n");

  const user = {
    task: "Create a track curriculum and exercise pool.",
    track: validated,
    output_schema: {
      curriculum: {
        version: "1.0",
        phases: [
          {
            phase: 1,
            name: "string",
            days: 7,
            focus: "string",
            notes: "string (optional)",
          },
        ],
      },
      exercises: [
        {
          exercise_slug: "string",
          name: "string",
          block: "warmup|review|new|apply",
          minutes_default: 5,
          difficulty: "beginner|easy|medium|hard",
          tags: ["string"],
          instructions_md: "string",
          tab_text: "string",
          diagram_specs: [],
        },
      ],
    },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI planner failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI planner returned no content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI planner returned non-JSON content");
  }

  return TrackWizardOutputSchema.parse(parsed);
}

export async function runAdHocWizard(input: AdHocWizardInput): Promise<AdHocWizardOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";

  const validated = AdHocWizardInputSchema.parse(input);

  const system = [
    "You help a guitarist create a one-off practice focus for today.",
    "Rules:",
    "- No standard music notation. Use chord symbols, tablature, and plain text only.",
    "- Keep it beginner-friendly and practice-first.",
    "- Output STRICT JSON only with keys: title, focus_prompt.",
    "- focus_prompt should be a single paragraph describing what to practice today, including constraints and a time budget.",
  ].join("\n");

  const user = {
    prompt: validated.prompt,
    minutes: validated.minutes,
    output_schema: { title: "string", focus_prompt: "string" },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ad-hoc planner failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI ad-hoc planner returned no content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI ad-hoc planner returned non-JSON content");
  }

  return AdHocWizardOutputSchema.parse(parsed);
}

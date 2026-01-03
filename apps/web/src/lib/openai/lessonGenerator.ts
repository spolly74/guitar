import { LessonV1Schema } from "@/lib/lesson/schema";

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
    throw new Error(`OpenAI lesson generator failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI lesson generator returned no content");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI lesson generator returned non-JSON content");
  }
}

export async function generateLessonV1FromPrompt(input: {
  date: string; // YYYY-MM-DD
  prompt: string;
}): Promise<import("@/lib/lesson/schema").LessonV1> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";

  const system = [
    "You are a guitar practice lesson generator.",
    "Output rules (CRITICAL):",
    "- Output STRICT JSON only (no markdown, no extra keys).",
    "- Must validate the provided schema exactly.",
    "- No standard music notation (no staff notation). Use chord symbols, tablature, and chord/fretboard diagram specs only.",
    "- Assume right-handed, standard tuning (EADGBE), 6-string guitar.",
    "- Total time must be >= 30 minutes.",
    "- Always include exactly these blocks: warmup, review, new, apply.",
    "- Do NOT output SVG or any pixel/layout math.",
    "- Diagrams are generated deterministically from voicing strings elsewhere; prefer leaving diagram_specs empty/omitted.",
  ].join("\n");

  const user = {
    date: input.date,
    user_prompt: input.prompt,
    schema_hint: {
      version: "1.0",
      date: "YYYY-MM-DD",
      title: "string",
      focus_prompt: "string",
      assumptions: {
        level: "beginner",
        daily_minutes_target: 30,
        instrument: "right-handed 6-string guitar",
        tuning: "EADGBE",
      },
      today_blocks: [
        {
          block: "warmup|review|new|apply",
          minutes: 0,
          items: [
            {
              exercise_slug: "string",
              name: "string",
              minutes: 0,
              instructions_md: "string (optional)",
              tab_text: "string (optional)",
              diagram_specs: [],
              concept_tags: [],
              common_mistakes: [],
              success_criteria: [],
            },
          ],
        },
      ],
      review_logic: { include_open_followups: true, prefer_recent_days: 7 },
      sources: [{ type: "single_agent_v1" }],
    },
  };

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user,
  });

  const first = LessonV1Schema.safeParse(parsed);
  if (first.success) return first.data;

  // Retry once with explicit validation errors to nudge the model back into schema.
  const parsed2 = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user: { ...user, correction: "Your previous JSON did not validate. Fix and re-output ONLY valid JSON.", issues: first.error.issues },
  });

  return LessonV1Schema.parse(parsed2);
}

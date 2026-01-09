import { LessonV1Schema } from "@/lib/lesson/schema";
import { openAiJsonChat, plannerModel } from "@/lib/openai/jsonChat";
import { requiredEnv } from "@/lib/server/requiredEnv";
import { loadAiTextAsset } from "@/lib/ai/assets";

function normalizeLessonCandidate(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const root: any = input;

  const blocks = root.today_blocks;
  if (!Array.isArray(blocks)) return root;

  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const items = (b as any).items;
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const ds = (it as any).diagram_specs;
      if (ds === undefined) continue;

      if (Array.isArray(ds)) continue;

      // Common model mistake: a single object instead of an array.
      if (ds && typeof ds === "object") {
        (it as any).diagram_specs = [ds];
        continue;
      }

      // Anything else (string/null/number): drop it to satisfy schema.
      delete (it as any).diagram_specs;
    }
  }

  return root;
}

async function openAiJson(input: {
  apiKey: string;
  model: string;
  temperature: number;
  system: string;
  user: unknown;
}): Promise<unknown> {
  return await openAiJsonChat({
    apiKey: input.apiKey,
    model: input.model,
    temperature: input.temperature,
    system: input.system,
    user: input.user,
  });
}

async function loadJazzPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/jazz_path.md");
}

async function loadPromptDrivenPolicy(): Promise<string> {
  return await loadAiTextAsset("ai/policies/prompt_driven.md");
}

export async function generateLessonV1FromPrompt(input: {
  date: string; // YYYY-MM-DD
  prompt: string;
}): Promise<import("@/lib/lesson/schema").LessonV1> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();

  const [promptPolicy, jazzPolicy] = await Promise.all([
    loadPromptDrivenPolicy(),
    loadJazzPolicy().catch(() => ""),
  ]);
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
    "- When describing chord shapes/voicings, do NOT put chord grip strings like x02010 in tab_text. Use instructions_md and chord symbols; voicings come from provided theory/planner JSON.",
    "- Use tab_text only for single-note/lead lines (melodies, scale fragments).",
    "",
    "Policy:",
    promptPolicy,
    "",
    "If no style is specified, default to beginner jazz guitar fundamentals:",
    jazzPolicy,
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

  const normalized = normalizeLessonCandidate(parsed);
  const first = LessonV1Schema.safeParse(normalized);
  if (first.success) return first.data;

  // Retry once with explicit validation errors to nudge the model back into schema.
  const parsed2 = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user: { ...user, correction: "Your previous JSON did not validate. Fix and re-output ONLY valid JSON.", issues: first.error.issues },
  });

  return LessonV1Schema.parse(normalizeLessonCandidate(parsed2));
}

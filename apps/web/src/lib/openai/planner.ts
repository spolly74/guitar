import { z } from "zod";
import { openAiJsonChat, plannerModel } from "@/lib/openai/jsonChat";
import { requiredEnv } from "@/lib/server/requiredEnv";

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
        phase: z.number().int().min(1).default(1),
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

const AdHocLessonPlanOutputSchema = z.object({
  title: z.string().min(1),
  focus_prompt: z.string().min(1),
  today_blocks: z
    .array(
      z
        .object({
          block: z.enum(["warmup", "review", "new", "apply"]),
          minutes: z.number().int().nonnegative(),
          items: z.array(
            z
              .object({
                exercise_slug: z.string().min(1),
                name: z.string().min(1),
                minutes: z.number().int().nonnegative(),
                instructions_md: z.string().optional(),
                tab_text: z.string().optional(),
                diagram_specs: z.array(z.unknown()).optional(),
                concept_tags: z.array(z.string()).optional(),
                common_mistakes: z.array(z.string()).optional(),
                success_criteria: z.array(z.string()).optional(),
              })
              .strict(),
          ),
        })
        .strict(),
    )
    .default([]),
});

export type AdHocLessonPlanOutput = z.infer<typeof AdHocLessonPlanOutputSchema>;

async function openAiJson(input: {
  apiKey: string;
  model: string;
  temperature: number;
  system: string;
  user: unknown;
}): Promise<unknown> {
  // Keep local signature for minimal diff; forward to shared helper.
  return await openAiJsonChat({
    apiKey: input.apiKey,
    model: input.model,
    temperature: input.temperature,
    system: input.system,
    user: input.user,
  });
}

export async function runTrackWizard(input: TrackWizardInput): Promise<TrackWizardOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();

  const validated = TrackWizardInputSchema.parse(input);

  const system = [
    "You design structured guitar practice curricula.",
    "Rules:",
    "- No standard music notation. Use chord symbols, tablature, and plain text only.",
    "- Keep it beginner-friendly and practice-first.",
    "- Output STRICT JSON only matching the requested schema.",
    "- Include enough exercises to generate daily plans with 4 blocks: warmup/review/new/apply.",
    "- IMPORTANT: Return at least 12 exercises total, with at least 2 per block.",
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

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user,
  });

  const first = TrackWizardOutputSchema.safeParse(parsed);
  if (first.success) return first.data;

  // If the only issue is "too few exercises", retry once with explicit corrective feedback.
  const needsMoreExercises = first.error.issues.some(
    (i) => i.path.join(".") === "exercises" && i.code === "too_small",
  );
  if (!needsMoreExercises) {
    throw first.error;
  }

  const retryUser = {
    ...user,
    correction:
      "Your previous output had too few exercises. Please output at least 12 exercises total, with at least 2 exercises for each block: warmup, review, new, apply.",
  };

  const parsed2 = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user: retryUser,
  });

  return TrackWizardOutputSchema.parse(parsed2);
}

export async function runAdHocWizard(input: AdHocWizardInput): Promise<AdHocWizardOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();

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

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user,
  });

  return AdHocWizardOutputSchema.parse(parsed);
}

export async function runAdHocLessonPlan(
  input: AdHocWizardInput,
): Promise<AdHocLessonPlanOutput> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = plannerModel();

  const validated = AdHocWizardInputSchema.parse(input);

  const system = [
    "You create a single ad-hoc guitar practice lesson.",
    "Rules:",
    "- No standard music notation. Use chord symbols, tablature, and plain text only.",
    "- Be prompt-specific: do not reuse generic exercises unless they directly fit the prompt.",
    "- Keep it beginner-friendly and practice-first.",
    "- Output STRICT JSON only.",
    "- You may choose a shorter/simpler structure; unused blocks should have minutes=0 and items=[].",
    "- IMPORTANT: Always return all four blocks: warmup, review, new, apply.",
  ].join("\n");

  const user = {
    prompt: validated.prompt,
    minutes: validated.minutes,
    output_schema: {
      title: "string",
      focus_prompt: "string",
      today_blocks: [
        {
          block: "warmup|review|new|apply",
          minutes: "int >= 0",
          items: [
            {
              exercise_slug: "string",
              name: "string",
              minutes: "int >= 0",
              instructions_md: "string",
              tab_text: "string (optional)",
              diagram_specs: "array (optional)",
              concept_tags: "array[string] (optional)",
            },
          ],
        },
      ],
    },
  };

  const parsed = await openAiJson({
    apiKey,
    model,
    temperature: 0.2,
    system,
    user,
  });

  return AdHocLessonPlanOutputSchema.parse(parsed);
}

import { z } from "zod";

// ============================================================================
// Learning Path Schemas
// ============================================================================

export const LearningDaySchema = z.object({
  day_number: z.number().int().positive(),
  title: z.string().min(1),
  focus: z.string(),
  estimated_minutes: z.number().int().positive().default(30),
  lesson_id: z.string().uuid().optional(),
  completed: z.boolean().optional(),
  completion_date: z.string().optional(),
});

export const LearningPhaseSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  objective: z.string(),
  days: z.array(LearningDaySchema),
});

export const LearningPlanSchema = z.object({
  phases: z.array(LearningPhaseSchema),
  estimated_days: z.number().int().positive(),
  user_notes: z.string().optional(),
  approved_at: z.string().optional(),
});

export const AdaptationEventSchema = z.object({
  timestamp: z.string(),
  trigger: z.enum([
    "user_feedback",
    "difficulty_flag",
    "chat_request",
    "completion_pattern",
  ]),
  description: z.string(),
  changes_made: z.string(),
});

export const LearningPathStatusSchema = z.enum([
  "draft",
  "approved",
  "in_progress",
  "completed",
  "paused",
]);

export const LearningPathSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().default(""),
  goal: z.string().default(""),
  plan: LearningPlanSchema.nullable(),
  plan_status: LearningPathStatusSchema.default("draft"),
  current_phase: z.number().int().positive().default(1),
  current_day: z.number().int().positive().default(1),
  total_days: z.number().int().positive().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  adaptation_history: z.array(AdaptationEventSchema).default([]),
});

// ============================================================================
// Lesson V2 Schemas
// ============================================================================

export const DiagramSpecSchema = z.union([
  // Chord diagram
  z.object({
    type: z.literal("chord"),
    style: z.string().optional(),
    title: z.string().optional(),
    tuning: z.array(z.string()).optional(),
    frets: z.array(z.union([z.number(), z.null()])),
    base_fret: z.number().optional(),
    root_strings: z.array(z.number()).optional(),
    finger_numbers: z.array(z.union([z.number(), z.null()])).optional(),
    note_roles: z.array(z.string().nullable()).optional(),
  }),
  // Fretboard diagram
  z.object({
    type: z.literal("fretboard"),
    style: z.string().optional(),
    title: z.string().optional(),
    tuning: z.array(z.string()).optional(),
    fret_range: z.tuple([z.number(), z.number()]),
    markers: z.array(
      z.object({
        string: z.number(),
        fret: z.number(),
        label: z.string().optional(),
        role: z.string().optional(),
      })
    ),
    show_fret_numbers: z.boolean().optional(),
    color_by_role: z.boolean().optional(),
  }),
  // Tablature
  z.object({
    type: z.literal("tablature"),
    style: z.string().optional(),
    title: z.string().optional(),
    tempo: z.number().optional(),
    time_signature: z.string().optional(),
    measures: z.array(
      z.object({
        beats: z.array(
          z.object({
            notes: z.array(
              z.union([
                z.number(),
                z.null(),
                z.object({
                  fret: z.union([z.number(), z.string()]),
                  technique: z.string().optional(),
                }),
              ])
            ),
            duration: z.number().optional(),
          })
        ),
      })
    ),
    chord_symbols: z
      .array(
        z.object({
          beat: z.number(),
          chord: z.string(),
        })
      )
      .optional(),
  }),
]);

export const ContentSectionSchema = z.object({
  type: z.enum([
    "text",
    "chord_diagram",
    "fretboard_diagram",
    "tablature",
    "tip",
    "warning",
  ]),
  content: z.union([z.string(), DiagramSpecSchema]),
});

export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  instructions_md: z.string(),
  minutes: z.number().int().positive(),
  diagrams: z.array(DiagramSpecSchema).default([]),
  tablature: DiagramSpecSchema.optional(),
  success_criteria: z.array(z.string()).default([]),
  common_mistakes: z.array(z.string()).default([]),
  // User interaction (filled in at runtime)
  completed: z.boolean().optional(),
  user_notes: z.string().optional(),
  difficulty_feedback: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
  flagged_for_followup: z.boolean().optional(),
});

export const LessonBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["warmup", "concept", "practice", "apply", "review"]),
  title: z.string(),
  minutes: z.number().int().nonnegative(),
  sections: z.array(ContentSectionSchema).default([]),
  exercises: z.array(ExerciseSchema).default([]),
});

export const LessonV2ContentSchema = z.object({
  version: z.literal("2.0"),
  id: z.string().uuid(),
  learning_path_id: z.string().uuid().nullable(),
  day_number: z.number().int().positive().nullable(),
  date: z.string(),

  // Content
  title: z.string(),
  objective: z.string(),
  prerequisites: z.array(z.string()).default([]),

  // Blocks
  blocks: z.array(LessonBlockSchema),

  // Summary
  key_takeaways: z.array(z.string()).default([]),
  next_preview: z.string().optional(),

  // Metadata
  difficulty_rating: z.number().int().min(1).max(5).optional(),
  estimated_minutes: z.number().int().positive(),
  adaptation_notes: z.string().optional(),
});

export const DifficultyFeedbackSchema = z.enum([
  "too_easy",
  "just_right",
  "too_hard",
]);

export const LessonFeedbackSchema = z.object({
  overall_difficulty: DifficultyFeedbackSchema.optional(),
  time_spent_minutes: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  flagged_exercises: z.array(z.string()).default([]),
});

// ============================================================================
// Chat Schemas
// ============================================================================

export const ChatRoleSchema = z.enum(["user", "assistant"]);

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  thread_id: z.string().uuid(),
  role: ChatRoleSchema,
  content: z.string(),
  diagrams: z.array(DiagramSpecSchema).nullable(),
  diagram_replacement: z
    .object({
      original_id: z.string(),
      new_diagram: DiagramSpecSchema,
    })
    .nullable(),
  created_at: z.string(),
});

export const ChatThreadSchema = z.object({
  id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  title: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  archived_at: z.string().nullable(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type LearningDay = z.infer<typeof LearningDaySchema>;
export type LearningPhase = z.infer<typeof LearningPhaseSchema>;
export type LearningPlan = z.infer<typeof LearningPlanSchema>;
export type AdaptationEvent = z.infer<typeof AdaptationEventSchema>;
export type LearningPathStatus = z.infer<typeof LearningPathStatusSchema>;
export type LearningPath = z.infer<typeof LearningPathSchema>;

export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;
export type ContentSection = z.infer<typeof ContentSectionSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type LessonBlock = z.infer<typeof LessonBlockSchema>;
export type LessonV2Content = z.infer<typeof LessonV2ContentSchema>;
export type DifficultyFeedback = z.infer<typeof DifficultyFeedbackSchema>;
export type LessonFeedback = z.infer<typeof LessonFeedbackSchema>;

export type ChatRole = z.infer<typeof ChatRoleSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatThread = z.infer<typeof ChatThreadSchema>;

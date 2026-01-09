import { z } from "zod";
import { claudeJsonChat } from "@/lib/anthropic/client";
import {
  LearningPlanSchema,
  type LearningPlan,
} from "@/lib/schemas/v2.schema";

const LearningPathPlannerOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  goal: z.string(),
  plan: LearningPlanSchema,
});

export type LearningPathPlannerOutput = z.infer<typeof LearningPathPlannerOutputSchema>;

const SYSTEM_PROMPT = `You are an expert guitar instructor and curriculum designer. Your job is to create structured learning paths that break complex guitar topics into manageable daily lessons.

## Your Task

Given a user's learning goal, create a comprehensive learning plan that:
1. Breaks the topic into logical phases (2-5 phases typically)
2. Breaks each phase into daily lessons (2-5 days per phase typically)
3. Ensures progressive skill building - each day builds on the previous
4. Keeps daily lessons focused and achievable (20-40 minutes)
5. Includes review and application opportunities

## Guidelines

- **Phases** represent major milestones or skill groups
- **Days** are individual practice sessions with specific focus
- Total path length: typically 7-21 days depending on topic complexity
- Each day should have a clear, specific focus (not too broad)
- Include practical application days, not just theory
- Consider voice leading, progressions, and musical context
- Assume a beginner-intermediate guitarist who can play basic chords

## Output Format

Return a JSON object with this structure:
{
  "title": "Clear, descriptive title for the learning path",
  "description": "Brief overview of what the student will learn",
  "goal": "Specific, measurable outcome the student will achieve",
  "plan": {
    "phases": [
      {
        "number": 1,
        "title": "Phase title",
        "objective": "What the student will achieve in this phase",
        "days": [
          {
            "day_number": 1,
            "title": "Day title",
            "focus": "Specific focus for this day",
            "estimated_minutes": 30
          }
        ]
      }
    ],
    "estimated_days": 12
  }
}

## Example Topics and Scope

- "Learn shell voicings" -> 10-14 days covering maj7/min7/dom7, string sets, voice leading
- "Master the CAGED system" -> 14-21 days covering all 5 shapes, connections, applications
- "Jazz blues comping" -> 7-10 days covering form, voicings, rhythm patterns
- "Minor pentatonic soloing" -> 7-12 days covering positions, licks, application

Be specific and practical. Each day should leave the student with something tangible they can play.`;

export interface LearningPathPlannerInput {
  topic: string;
  goals?: string;
  skill_level?: "beginner" | "intermediate" | "advanced";
  available_minutes_per_day?: number;
  max_days?: number;
}

export async function runLearningPathPlannerV2(
  input: LearningPathPlannerInput
): Promise<LearningPathPlannerOutput> {
  const userMessage = {
    topic: input.topic,
    additional_goals: input.goals || "None specified",
    skill_level: input.skill_level || "beginner",
    available_minutes_per_day: input.available_minutes_per_day || 30,
    max_days: input.max_days || 21,
    instruction:
      "Create a comprehensive learning plan for this guitar topic. Return ONLY valid JSON matching the schema described.",
  };

  const parsed = await claudeJsonChat<unknown>({
    system: SYSTEM_PROMPT,
    user: userMessage,
    temperature: 0.3,
  });

  const result = LearningPathPlannerOutputSchema.safeParse(parsed);
  if (result.success) {
    // Ensure estimated_days is calculated correctly
    const totalDays = result.data.plan.phases.reduce(
      (sum, phase) => sum + phase.days.length,
      0
    );
    result.data.plan.estimated_days = totalDays;
    return result.data;
  }

  // Retry with correction
  const retryMessage = {
    ...userMessage,
    correction: "Your previous response did not validate. Fix it and return ONLY valid JSON.",
    issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };

  const parsed2 = await claudeJsonChat<unknown>({
    system: SYSTEM_PROMPT,
    user: retryMessage,
    temperature: 0.1,
  });

  const result2 = LearningPathPlannerOutputSchema.parse(parsed2);
  const totalDays = result2.plan.phases.reduce(
    (sum, phase) => sum + phase.days.length,
    0
  );
  result2.plan.estimated_days = totalDays;
  return result2;
}

/**
 * Adapt an existing plan based on user feedback.
 */
export async function adaptLearningPathV2(input: {
  currentPlan: LearningPlan;
  currentDay: number;
  feedback: {
    difficulty?: "too_easy" | "just_right" | "too_hard";
    flagged_topics?: string[];
    chat_insights?: string;
    completion_rate?: number;
  };
}): Promise<{
  adapted_plan: LearningPlan;
  changes_description: string;
}> {
  const adaptPrompt = `You are adapting an existing guitar learning path based on student feedback.

Current plan:
${JSON.stringify(input.currentPlan, null, 2)}

Current progress: Day ${input.currentDay} of ${input.currentPlan.estimated_days}

Feedback:
- Difficulty: ${input.feedback.difficulty || "not specified"}
- Flagged topics needing more practice: ${input.feedback.flagged_topics?.join(", ") || "none"}
- Insights from chat: ${input.feedback.chat_insights || "none"}
- Completion rate: ${input.feedback.completion_rate ? `${input.feedback.completion_rate}%` : "not tracked"}

Based on this feedback, adapt the REMAINING days of the plan (day ${input.currentDay + 1} onwards).

If too_hard:
- Add review days
- Simplify upcoming content
- Break complex days into smaller pieces

If too_easy:
- Combine days where appropriate
- Add more challenging material
- Move faster through basics

If flagged_topics exist:
- Add extra practice for those topics
- Revisit them in different contexts

Return JSON with:
{
  "adapted_plan": { /* full updated plan with same schema */ },
  "changes_description": "Brief description of what changed and why"
}`;

  const parsed = await claudeJsonChat<{
    adapted_plan: LearningPlan;
    changes_description: string;
  }>({
    system: adaptPrompt,
    user: { instruction: "Adapt the plan based on the feedback provided." },
    temperature: 0.3,
  });

  return parsed;
}

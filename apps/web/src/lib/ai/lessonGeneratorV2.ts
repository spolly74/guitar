import { v4 as uuidv4 } from "uuid";
import { claudeJsonChat } from "@/lib/anthropic/client";
import {
  LessonV2ContentSchema,
  type LessonV2Content,
} from "@/lib/schemas/v2.schema";

const SYSTEM_PROMPT = `You are an expert guitar instructor creating detailed practice lessons. Generate a complete lesson following the V2 schema format.

## Lesson Structure

Each lesson has:
- A clear title and objective
- Prerequisites (what the student should know)
- Blocks of content (warmup, concept, practice, apply, review)
- Key takeaways
- Optional preview of what's next

## Block Types

- **warmup**: 3-5 minute exercises to prepare physically and mentally
- **concept**: Explanation of theory, technique, or musical ideas
- **practice**: Focused drilling on specific skills
- **apply**: Put skills into musical context (play over backing track, song section)
- **review**: Reinforce previous material

## Content Sections

Each block can have sections of type:
- text: Markdown formatted explanations
- chord_diagram: JSON spec for a chord shape
- fretboard_diagram: JSON spec for scale/arpeggio patterns
- tablature: JSON spec for specific note sequences
- tip: Helpful hint (green box)
- warning: Common mistake to avoid (amber box)

## Exercise Format

Exercises should include:
- Clear step-by-step instructions
- Time allocation
- Success criteria (how to know you've got it)
- Common mistakes to avoid
- Diagrams where helpful

## Diagram Specifications

When including diagrams, use these JSON formats:

Chord diagram:
{
  "type": "chord",
  "title": "Cmaj7",
  "frets": [null, 3, 2, 0, 0, 0],
  "root_strings": [1],
  "finger_numbers": [null, 3, 2, null, null, null]
}

Fretboard diagram (for scales, arpeggios):
{
  "type": "fretboard",
  "title": "C Major Scale - Position 1",
  "fret_range": [0, 5],
  "markers": [
    {"string": 6, "fret": 3, "label": "C", "role": "root"},
    {"string": 6, "fret": 5, "label": "D"},
    {"string": 5, "fret": 2, "label": "E"},
    ...
  ]
}

Tablature (for specific licks/phrases):
{
  "type": "tablature",
  "title": "ii-V-I Voice Leading",
  "measures": [
    {"beats": [{"notes": [null, null, null, 5, 3, null]}]}
  ]
}

## Output Format

Return a JSON object matching the LessonV2Content schema exactly.`;

interface LessonGeneratorInput {
  learningPathId?: string;
  dayNumber?: number;
  dayTitle?: string;
  dayFocus?: string;
  phaseContext?: string;
  prompt: string;
  estimatedMinutes?: number;
  previousLessons?: Array<{ title: string; summary: string }>;
}

export async function generateLessonV2(
  input: LessonGeneratorInput
): Promise<LessonV2Content> {
  const lessonId = uuidv4();
  const date = new Date().toISOString().slice(0, 10);

  const userMessage = buildUserMessage(input, lessonId, date);

  const parsed = await claudeJsonChat<unknown>({
    system: SYSTEM_PROMPT,
    user: userMessage,
    temperature: 0.4,
    max_tokens: 4000,
  });

  // Validate and fix the response
  const result = LessonV2ContentSchema.safeParse(parsed);
  if (result.success) {
    // Ensure IDs are set correctly
    return fixLessonIds(result.data, lessonId, input.learningPathId, input.dayNumber);
  }

  // Retry with corrections
  const retryMessage = {
    ...userMessage,
    correction: "Your previous response did not validate. Fix these issues and return valid JSON:",
    issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };

  const parsed2 = await claudeJsonChat<unknown>({
    system: SYSTEM_PROMPT,
    user: retryMessage,
    temperature: 0.2,
    max_tokens: 4000,
  });

  const result2 = LessonV2ContentSchema.parse(parsed2);
  return fixLessonIds(result2, lessonId, input.learningPathId, input.dayNumber);
}

function buildUserMessage(
  input: LessonGeneratorInput,
  lessonId: string,
  date: string
): Record<string, unknown> {
  const message: Record<string, unknown> = {
    lesson_id: lessonId,
    date,
    estimated_minutes: input.estimatedMinutes || 30,
  };

  if (input.learningPathId) {
    message.learning_path_id = input.learningPathId;
    message.day_number = input.dayNumber;
    message.is_learning_path_lesson = true;
  } else {
    message.is_quick_practice = true;
  }

  if (input.dayTitle) {
    message.day_title = input.dayTitle;
  }

  if (input.dayFocus) {
    message.day_focus = input.dayFocus;
  }

  if (input.phaseContext) {
    message.phase_context = input.phaseContext;
  }

  message.user_prompt = input.prompt;

  if (input.previousLessons && input.previousLessons.length > 0) {
    message.previous_lessons = input.previousLessons;
    message.instruction = `Create lesson ${input.dayNumber} based on the day focus. Build on what was covered in previous lessons. Include warmup that reviews key concepts.`;
  } else {
    message.instruction =
      "Create a comprehensive lesson for this topic. Include warmup, concept explanation, practice exercises, and application.";
  }

  return message;
}

function fixLessonIds(
  lesson: LessonV2Content,
  id: string,
  learningPathId?: string,
  dayNumber?: number
): LessonV2Content {
  return {
    ...lesson,
    version: "2.0",
    id,
    learning_path_id: learningPathId ?? null,
    day_number: dayNumber ?? null,
    date: lesson.date || new Date().toISOString().slice(0, 10),
    blocks: lesson.blocks.map((block, blockIndex) => ({
      ...block,
      id: block.id || `block-${blockIndex}`,
      exercises: block.exercises.map((ex, exIndex) => ({
        ...ex,
        id: ex.id || `${block.id || `block-${blockIndex}`}-ex-${exIndex}`,
      })),
    })),
  };
}

/**
 * Generate a lesson for a specific day in a learning path
 */
export async function generateLearningPathLesson(input: {
  learningPathId: string;
  dayNumber: number;
  dayTitle: string;
  dayFocus: string;
  phaseTitle: string;
  phaseObjective: string;
  estimatedMinutes: number;
  pathTitle: string;
  pathGoal: string;
  previousLessonSummaries?: Array<{ title: string; summary: string }>;
}): Promise<LessonV2Content> {
  const phaseContext = `
Learning Path: ${input.pathTitle}
Goal: ${input.pathGoal}
Current Phase: ${input.phaseTitle}
Phase Objective: ${input.phaseObjective}
`;

  return generateLessonV2({
    learningPathId: input.learningPathId,
    dayNumber: input.dayNumber,
    dayTitle: input.dayTitle,
    dayFocus: input.dayFocus,
    phaseContext,
    prompt: `${input.dayTitle}: ${input.dayFocus}`,
    estimatedMinutes: input.estimatedMinutes,
    previousLessons: input.previousLessonSummaries,
  });
}

/**
 * Generate a quick practice lesson from a prompt
 */
export async function generateQuickPracticeLesson(input: {
  prompt: string;
  estimatedMinutes?: number;
}): Promise<LessonV2Content> {
  return generateLessonV2({
    prompt: input.prompt,
    estimatedMinutes: input.estimatedMinutes || 30,
  });
}

import { claudeChat, claudeChatStream } from "@/lib/anthropic/client";
import type {
  LessonV2Content,
  DiagramSpec,
  LearningPlan,
} from "@/lib/schemas/v2.schema";

export interface ChatContext {
  lesson: LessonV2Content;
  learningPath?: {
    title: string;
    goal: string;
    plan: LearningPlan;
    currentDay: number;
    currentPhase: number;
  };
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ChatResponse {
  content: string;
  diagrams?: DiagramSpec[];
  diagramReplacement?: {
    originalId: string;
    newDiagram: DiagramSpec;
  };
}

function buildSystemPrompt(context: ChatContext): string {
  const lessonContext = `
## Current Lesson
Title: ${context.lesson.title}
Objective: ${context.lesson.objective}
Day: ${context.lesson.day_number ?? "Quick Practice"}

### Lesson Blocks
${context.lesson.blocks
  .map(
    (block) => `
**${block.title}** (${block.type}, ${block.minutes} min)
${block.sections.map((s) => (typeof s.content === "string" ? s.content : "[Diagram]")).join("\n")}
${block.exercises.map((e) => `- Exercise: ${e.name}\n  ${e.instructions_md}`).join("\n")}
`
  )
  .join("\n")}

### Key Takeaways
${context.lesson.key_takeaways.join("\n")}
`;

  const pathContext = context.learningPath
    ? `
## Learning Path Context
Path: ${context.learningPath.title}
Goal: ${context.learningPath.goal}
Progress: Day ${context.learningPath.currentDay} of ${context.learningPath.plan.estimated_days}, Phase ${context.learningPath.currentPhase} of ${context.learningPath.plan.phases.length}
`
    : "";

  return `You are an expert guitar instructor assistant helping a student during their practice session. You have access to their current lesson content and can answer questions, provide clarification, and offer alternative explanations.

${lessonContext}

${pathContext}

## Your Capabilities

1. **Answer Questions**: Explain concepts from the lesson, clarify chord voicings, discuss theory, or elaborate on techniques.

2. **Generate Diagrams**: When helpful, you can include chord diagrams, fretboard diagrams, or tablature in your response. Use this JSON format embedded in your response:

   For chord diagrams:
   \`\`\`diagram
   {"type":"chord","title":"Cmaj7","frets":[null,3,2,0,0,0],"root_strings":[1],"finger_numbers":[null,3,2,0,0,0]}
   \`\`\`

   For fretboard diagrams:
   \`\`\`diagram
   {"type":"fretboard","title":"C Major Scale","fret_range":[0,5],"markers":[{"string":5,"fret":3,"label":"C","role":"root"},{"string":5,"fret":5,"label":"D"},{"string":4,"fret":2,"label":"E"},{"string":4,"fret":3,"label":"F"},{"string":4,"fret":5,"label":"G"},{"string":3,"fret":2,"label":"A"},{"string":3,"fret":4,"label":"B"},{"string":3,"fret":5,"label":"C","role":"root"}]}
   \`\`\`

   For tablature:
   \`\`\`diagram
   {"type":"tablature","title":"Example Lick","measures":[{"beats":[{"notes":[null,null,null,5,null,null]},{"notes":[null,null,null,7,null,null]},{"notes":[null,null,5,null,null,null]},{"notes":[null,null,7,null,null,null]}]}]}
   \`\`\`

3. **Suggest Diagram Modifications**: If the student asks to modify a diagram from the lesson (different voicing, different position, etc.), include a diagram replacement instruction:
   \`\`\`replace-diagram
   {"originalId":"exercise-1-chord-1","newDiagram":{"type":"chord",...}}
   \`\`\`

## Guidelines

- Be concise but thorough. Students are mid-practice, so keep responses focused.
- Use musical terminology appropriately but explain when needed.
- Reference specific parts of the lesson when relevant.
- Encourage the student and acknowledge their progress.
- If asked about something outside the current lesson, you can still help but mention how it relates to what they're learning.
- When showing chord voicings, always specify which fret and strings.
- For scales and patterns, indicate positions on the fretboard clearly.

## Response Format

Respond naturally in markdown. Embed diagram JSON blocks when visuals would help. Keep responses conversational but informative.`;
}

export async function chatWithLesson(
  context: ChatContext,
  userMessage: string
): Promise<ChatResponse> {
  const systemPrompt = buildSystemPrompt(context);

  const messages = [
    ...context.conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await claudeChat({
    system: systemPrompt,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  return parseResponse(response);
}

export async function* chatWithLessonStream(
  context: ChatContext,
  userMessage: string
): AsyncGenerator<{ type: "text" | "done"; content: string }> {
  const systemPrompt = buildSystemPrompt(context);

  const messages = [
    ...context.conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  let fullResponse = "";

  for await (const chunk of claudeChatStream({
    system: systemPrompt,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  })) {
    fullResponse += chunk;
    yield { type: "text", content: chunk };
  }

  yield { type: "done", content: fullResponse };
}

function parseResponse(response: string): ChatResponse {
  const diagrams: DiagramSpec[] = [];
  let diagramReplacement: ChatResponse["diagramReplacement"];

  // Extract diagram blocks
  const diagramRegex = /```diagram\n([\s\S]*?)\n```/g;
  let match;
  while ((match = diagramRegex.exec(response)) !== null) {
    try {
      const diagram = JSON.parse(match[1]) as DiagramSpec;
      diagrams.push(diagram);
    } catch {
      // Invalid JSON, skip
    }
  }

  // Extract replacement blocks
  const replaceRegex = /```replace-diagram\n([\s\S]*?)\n```/g;
  while ((match = replaceRegex.exec(response)) !== null) {
    try {
      const replacement = JSON.parse(match[1]);
      if (replacement.originalId && replacement.newDiagram) {
        diagramReplacement = {
          originalId: replacement.originalId,
          newDiagram: replacement.newDiagram,
        };
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  // Clean up the response content (remove the JSON blocks)
  const cleanedContent = response
    .replace(/```diagram\n[\s\S]*?\n```/g, "")
    .replace(/```replace-diagram\n[\s\S]*?\n```/g, "")
    .trim();

  return {
    content: cleanedContent,
    diagrams: diagrams.length > 0 ? diagrams : undefined,
    diagramReplacement,
  };
}

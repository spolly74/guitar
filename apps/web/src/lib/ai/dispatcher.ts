import type { LessonV1 } from "@/lib/lesson/schema";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { runGuitarTheoryAgent } from "@/lib/ai/guitarTheory";
import { runLessonPlannerAgent } from "@/lib/ai/lessonPlanner";
import { retrieveRagContext } from "@/lib/ai/retrieval";
import { enrichLessonWithDeterministicDiagrams } from "@/lib/ai/diagramEnrich";
import { generateLessonV1FromPrompt } from "@/lib/openai/lessonGenerator";

export async function generateLessonViaOrchestrator(input: {
  supabase: { rpc: (fn: string, args: any) => any };
  date: string; // YYYY-MM-DD
  user_prompt: string;
}): Promise<{ lesson: LessonV1; orchestrator: import("@/lib/ai/orchestrator").OrchestratorOutput }> {
  const rag = await retrieveRagContext({
    supabase: input.supabase,
    query: input.user_prompt,
    topK: 6,
  });

  const orchestrator = await runOrchestrator({
    user_prompt: input.user_prompt,
    minutes_total: 30,
    retrieval_context: rag.contextText,
  });

  const theory = await runGuitarTheoryAgent({
    user_prompt: input.user_prompt,
    orchestrator_goal: orchestrator.goal,
    retrieval_context: rag.contextText,
  });

  const plan = await runLessonPlannerAgent({
    user_prompt: input.user_prompt,
    orchestrator_goal: orchestrator.goal,
    theory,
    minutes_total: 30,
    retrieval_context: rag.contextText,
  });

  const lesson = await generateLessonV1FromPrompt({
    date: input.date,
    prompt: [
      orchestrator.lesson_prompt,
      "",
      rag.contextText ? rag.contextText : "",
      "",
      "Use this musical data (JSON) as the authoritative source for chord symbols, progressions, and voicings:",
      JSON.stringify(theory),
      "",
      "Use this lesson plan structure (JSON) to allocate time and decide what belongs in each block:",
      JSON.stringify(plan),
    ].join("\n"),
  });

  const enrichedLesson = enrichLessonWithDeterministicDiagrams({
    lesson,
    theory,
    plan,
  });

  // Attach orchestrator metadata as a source (UI still only renders structured lesson fields).
  enrichedLesson.sources = [
    ...(enrichedLesson.sources ?? []),
    {
      type: "orchestrator_v1",
      goal: orchestrator.goal,
      tasks: orchestrator.tasks,
      constraints: orchestrator.constraints,
    },
    { type: "guitar_theory_v1", ...theory },
    { type: "lesson_planner_v1", ...plan },
    {
      type: "retrieval_v1",
      top_k: rag.snippets.length,
      snippets: rag.snippets.map((s) => ({
        document_id: s.documentId,
        similarity: s.similarity,
      })),
    },
  ];

  return { lesson: enrichedLesson, orchestrator };
}

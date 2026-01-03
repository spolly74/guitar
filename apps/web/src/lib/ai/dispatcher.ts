import type { LessonV1 } from "@/lib/lesson/schema";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { runGuitarTheoryAgent } from "@/lib/ai/guitarTheory";
import { runLessonPlannerAgent } from "@/lib/ai/lessonPlanner";
import { retrieveRagContext } from "@/lib/ai/retrieval";
import { enrichLessonWithDeterministicDiagrams } from "@/lib/ai/diagramEnrich";
import { loadTopicPacksForPrompt, packsToContextText } from "@/lib/ai/topicPacks";
import { generateLessonV1FromPrompt } from "@/lib/openai/lessonGenerator";
import { assessLessonQuality } from "@/lib/ai/quality";
import { webSearch } from "@/lib/ai/webSearch";
import { collectWebSources } from "@/lib/ai/webCollect";
import { runResearchAgent } from "@/lib/ai/researchAgent";
import { runLessonCritic } from "@/lib/ai/lessonCritic";

export async function generateLessonViaOrchestrator(input: {
  supabase: { rpc: (fn: string, args: any) => any };
  date: string; // YYYY-MM-DD
  user_prompt: string;
}): Promise<{ lesson: LessonV1; orchestrator: import("@/lib/ai/orchestrator").OrchestratorOutput }> {
  // Multi-agent: research agent decides what to search for (web).
  const research = await runResearchAgent({ user_prompt: input.user_prompt });

  // Gather evidence in parallel (Library retrieval + built-in packs + web research).
  const [rag, packs, webResultsNested] = await Promise.all([
    retrieveRagContext({
      supabase: input.supabase,
      query: input.user_prompt,
      topK: 6,
      minSimilarity: 0.78,
    }),
    loadTopicPacksForPrompt(input.user_prompt),
    Promise.all(research.queries.map((q) => webSearch({ query: q, count: 6 }))),
  ]);

  const webResults = webResultsNested.flat();
  const web = await collectWebSources({ results: webResults, maxSources: 3 });

  const packContext = packsToContextText(packs);
  const referenceContext = [rag.contextText, packContext, web.contextText]
    .filter(Boolean)
    .join("\n\n");

  // Phase 7: parallelize independent agent calls.
  // Orchestrator and Theory can run in parallel once retrieval context is available.
  const [orchestrator, theory] = await Promise.all([
    runOrchestrator({
      user_prompt: input.user_prompt,
      minutes_total: 30,
      retrieval_context: referenceContext,
    }),
    runGuitarTheoryAgent({
      user_prompt: input.user_prompt,
      // Keep theory independent of orchestrator output for parallelism.
      retrieval_context: referenceContext,
    }),
  ]);

  const plan = await runLessonPlannerAgent({
    user_prompt: input.user_prompt,
    orchestrator_goal: orchestrator.goal,
    theory,
    minutes_total: 30,
    retrieval_context: referenceContext,
  });

  const lessonPromptBase = [
    `User prompt: ${input.user_prompt}`,
    "",
    orchestrator.lesson_prompt,
    "",
    referenceContext ? referenceContext : "",
    "",
    "Use this musical data (JSON) as the authoritative source for chord symbols, progressions, and voicings:",
    JSON.stringify(theory),
    "",
    "Use this lesson plan structure (JSON) to allocate time and decide what belongs in each block:",
    JSON.stringify(plan),
    "",
    "Quality requirements:",
    "- Do not say 'learn X'. Provide specific chord shapes/voicings/drills and step-by-step practice instructions.",
    "- If CAGED is requested, include C/A/G/E/D shape-labeled chord grips and a progression application.",
  ].join("\n");

  const lesson = await generateLessonV1FromPrompt({
    date: input.date,
    prompt: lessonPromptBase,
  });

  let enrichedLesson = enrichLessonWithDeterministicDiagrams({
    lesson,
    theory,
    plan,
  });

  const issues = assessLessonQuality({ lesson: enrichedLesson, userPrompt: input.user_prompt });
  if (issues.length > 0) {
    // One retry: tell the generator exactly what was missing.
    const retry = await generateLessonV1FromPrompt({
      date: input.date,
      prompt: [
        lessonPromptBase,
        "",
        "Fix these quality issues in the lesson output:",
        JSON.stringify(issues),
      ].join("\n"),
    });
    enrichedLesson = enrichLessonWithDeterministicDiagrams({ lesson: retry, theory, plan });
  }

  // External critic agent pass (one-shot). If it finds issues, retry once with explicit fix instructions.
  const critic = await runLessonCritic({
    user_prompt: input.user_prompt,
    evidence_context: referenceContext,
    lesson: enrichedLesson,
  });
  if (!critic.ok && critic.fix_instructions.length > 0) {
    const retry2 = await generateLessonV1FromPrompt({
      date: input.date,
      prompt: [
        lessonPromptBase,
        "",
        "Apply these fix instructions:",
        JSON.stringify(critic.fix_instructions),
      ].join("\n"),
    });
    enrichedLesson = enrichLessonWithDeterministicDiagrams({ lesson: retry2, theory, plan });
  }

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
    ...(packs.length > 0
      ? [{ type: "topic_packs_v1", packs: packs.map((p) => ({ id: p.id, title: p.title })) }]
      : []),
    ...(web.sources.length > 0
      ? [
          {
            type: "web_sources_v1",
            sources: web.sources.map((s) => ({
              title: s.title,
              url: s.url,
            })),
          },
        ]
      : []),
    { type: "research_agent_v1", ...research },
  ];

  return { lesson: enrichedLesson, orchestrator };
}

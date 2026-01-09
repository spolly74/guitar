import { retrieveRagContext } from "@/lib/ai/retrieval";
import { loadTopicPacksForPrompt, packsToContextText } from "@/lib/ai/topicPacks";
import { runResearchAgent } from "@/lib/ai/researchAgent";
import { webSearch } from "@/lib/ai/webSearch";
import { collectWebSources } from "@/lib/ai/webCollect";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { runGuitarTheoryAgent } from "@/lib/ai/guitarTheory";
import { runLearningPathPlannerAgent } from "@/lib/ai/learningPathPlanner";

export async function generateLearningPath14d(input: {
  supabase: { rpc: (fn: string, args: any) => any };
  user_prompt: string;
  total_days?: number; // default 14
  daily_minutes?: number; // default 30
}) {
  const totalDays = input.total_days ?? 14;
  const dailyMinutes = input.daily_minutes ?? 30;

  const research = await runResearchAgent({ user_prompt: input.user_prompt });

  const [rag, packs, webResultsNested] = await Promise.all([
    retrieveRagContext({
      supabase: input.supabase,
      query: input.user_prompt,
      topK: 8,
      minSimilarity: 0.75,
    }),
    loadTopicPacksForPrompt(input.user_prompt),
    Promise.all(research.queries.map((q) => webSearch({ query: q, count: 6 }))),
  ]);

  const webResults = webResultsNested.flat();
  const web = await collectWebSources({ results: webResults, maxSources: 4 });

  const packContext = packsToContextText(packs);
  const evidenceContext = [rag.contextText, packContext, web.contextText]
    .filter(Boolean)
    .join("\n\n");

  const orchestrator = await runOrchestrator({
    user_prompt: input.user_prompt,
    minutes_total: dailyMinutes,
    retrieval_context: evidenceContext,
  });

  const theory = await runGuitarTheoryAgent({
    user_prompt: input.user_prompt,
    orchestrator_goal: orchestrator.goal,
    retrieval_context: evidenceContext,
  });

  const learningPath = await runLearningPathPlannerAgent({
    user_prompt: input.user_prompt,
    total_days: totalDays,
    daily_minutes: dailyMinutes,
    evidence_context: evidenceContext,
    theory_json: theory,
    orchestrator_goal: orchestrator.goal,
  });

  return {
    learningPath,
    evidence: {
      research,
      library: rag.snippets,
      packs: packs.map((p) => ({ id: p.id, title: p.title })),
      web_sources: web.sources.map((s) => ({ title: s.title, url: s.url })),
    },
  };
}

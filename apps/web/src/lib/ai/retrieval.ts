import { retrieveKnowledge } from "@/lib/knowledge/retrieve";

type SupabaseRpcLike = {
  rpc: (fn: string, args: any) => any;
};

export type RetrievedSnippet = {
  documentId: string;
  similarity: number;
  content: string;
};

function trimTo(s: string, maxChars: number) {
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export async function retrieveRagContext(input: {
  supabase: SupabaseRpcLike;
  query: string;
  topK?: number;
  maxSnippetChars?: number;
  maxTotalChars?: number;
}): Promise<{ snippets: RetrievedSnippet[]; contextText: string }> {
  const snippets = await retrieveKnowledge({
    supabase: input.supabase,
    query: input.query,
    topK: input.topK ?? 6,
  });

  const maxSnippetChars = input.maxSnippetChars ?? 900;
  const maxTotalChars = input.maxTotalChars ?? 3000;

  const trimmed: RetrievedSnippet[] = [];
  let used = 0;
  for (const s of snippets) {
    const content = trimTo(s.content, maxSnippetChars);
    if (!content) continue;
    if (used + content.length > maxTotalChars) break;
    used += content.length;
    trimmed.push({ ...s, content });
  }

  const contextText =
    trimmed.length === 0
      ? ""
      : [
          "Retrieved context (from your Library; treat as reference material):",
          ...trimmed.map(
            (s, i) =>
              `#${i + 1} (sim=${s.similarity.toFixed(3)})\n${s.content}`.trim(),
          ),
        ].join("\n\n");

  return { snippets: trimmed, contextText };
}

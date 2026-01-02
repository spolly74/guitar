import { createEmbeddingProvider, vectorToSql } from "./embed";

type SupabaseLike = {
  rpc: (fn: string, args: any) => any;
};

export async function retrieveKnowledge(input: {
  supabase: SupabaseLike;
  query: string;
  topK?: number;
}): Promise<Array<{ documentId: string; content: string; similarity: number }>> {
  const q = input.query.trim();
  if (!q) return [];

  const embedder = createEmbeddingProvider();
  const [embedding] = await embedder.embedMany([q]);

  const res = await input.supabase.rpc("match_knowledge_chunks", {
    query_embedding: vectorToSql(embedding),
    match_count: input.topK ?? 8,
  });

  if (res.error) throw new Error(res.error.message);

  return (res.data ?? []).map((r: any) => ({
    documentId: r.document_id as string,
    content: r.content as string,
    similarity: Number(r.similarity ?? 0),
  }));
}

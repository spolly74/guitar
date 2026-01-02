-- RPC for semantic search over knowledge chunks (pgvector).

-- Requires:
-- - extension vector
-- - public.knowledge_chunks(user_id, embedding vector(1536), content, document_id)
-- - RLS on knowledge_chunks (auth.uid() = user_id)

create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float4
)
language sql
stable
as $$
  select
    kc.id as chunk_id,
    kc.document_id,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::float4 as similarity
  from public.knowledge_chunks kc
  where kc.user_id = auth.uid()
    and kc.embedding is not null
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

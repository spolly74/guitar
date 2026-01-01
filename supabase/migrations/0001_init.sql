-- Guitar Practice App (v1) - initial schema + RLS

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Plans (daily plan JSON)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  title text not null default '',
  focus_prompt text not null default '',
  plan_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

-- Practice sessions (a user can practice multiple times per day)
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  session_date date not null default (now()::date),
  started_at timestamptz,
  ended_at timestamptz,
  total_minutes int not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger practice_sessions_set_updated_at
before update on public.practice_sessions
for each row execute function public.set_updated_at();

-- Exercise logs (per exercise item within a session)
create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_session_id uuid not null references public.practice_sessions(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  block text not null check (block in ('warmup','review','new','apply')),
  exercise_slug text not null,
  name text not null default '',
  completed boolean not null default false,
  minutes int not null default 0,
  notes text not null default '',
  flagged_for_followup boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists exercise_logs_user_id_idx on public.exercise_logs(user_id);
create index if not exists exercise_logs_session_id_idx on public.exercise_logs(practice_session_id);

-- Follow-ups (flagged concepts/exercises)
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_plan_id uuid references public.plans(id) on delete set null,
  source_exercise_slug text,
  title text not null default '',
  status text not null default 'open' check (status in ('open','snoozed','done')),
  snoozed_until date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger follow_ups_set_updated_at
before update on public.follow_ups
for each row execute function public.set_updated_at();

create index if not exists follow_ups_user_id_status_idx on public.follow_ups(user_id, status);

-- Knowledge base: documents + chunks (pgvector)
create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'text' check (source_type in ('text','url','youtube')),
  source_url text,
  title text not null default '',
  raw_text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_documents_user_id_idx on public.knowledge_documents(user_id);

-- NOTE: embedding dimension is configurable; 1536 matches many common embedding models.
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists knowledge_chunks_user_id_idx on public.knowledge_chunks(user_id);
create index if not exists knowledge_chunks_document_id_idx on public.knowledge_chunks(document_id);

-- Vector index for similarity search (cosine distance)
create index if not exists knowledge_chunks_embedding_ivfflat_idx
on public.knowledge_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- RLS
alter table public.plans enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.follow_ups enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

-- Policies: users can only access their own rows
create policy "plans_select_own"
on public.plans for select
using (auth.uid() = user_id);

create policy "plans_insert_own"
on public.plans for insert
with check (auth.uid() = user_id);

create policy "plans_update_own"
on public.plans for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "plans_delete_own"
on public.plans for delete
using (auth.uid() = user_id);

create policy "practice_sessions_select_own"
on public.practice_sessions for select
using (auth.uid() = user_id);

create policy "practice_sessions_insert_own"
on public.practice_sessions for insert
with check (auth.uid() = user_id);

create policy "practice_sessions_update_own"
on public.practice_sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "practice_sessions_delete_own"
on public.practice_sessions for delete
using (auth.uid() = user_id);

create policy "exercise_logs_select_own"
on public.exercise_logs for select
using (auth.uid() = user_id);

create policy "exercise_logs_insert_own"
on public.exercise_logs for insert
with check (auth.uid() = user_id);

create policy "exercise_logs_update_own"
on public.exercise_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "exercise_logs_delete_own"
on public.exercise_logs for delete
using (auth.uid() = user_id);

create policy "follow_ups_select_own"
on public.follow_ups for select
using (auth.uid() = user_id);

create policy "follow_ups_insert_own"
on public.follow_ups for insert
with check (auth.uid() = user_id);

create policy "follow_ups_update_own"
on public.follow_ups for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "follow_ups_delete_own"
on public.follow_ups for delete
using (auth.uid() = user_id);

create policy "knowledge_documents_select_own"
on public.knowledge_documents for select
using (auth.uid() = user_id);

create policy "knowledge_documents_insert_own"
on public.knowledge_documents for insert
with check (auth.uid() = user_id);

create policy "knowledge_documents_update_own"
on public.knowledge_documents for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "knowledge_documents_delete_own"
on public.knowledge_documents for delete
using (auth.uid() = user_id);

create policy "knowledge_chunks_select_own"
on public.knowledge_chunks for select
using (auth.uid() = user_id);

create policy "knowledge_chunks_insert_own"
on public.knowledge_chunks for insert
with check (auth.uid() = user_id);

create policy "knowledge_chunks_update_own"
on public.knowledge_chunks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "knowledge_chunks_delete_own"
on public.knowledge_chunks for delete
using (auth.uid() = user_id);

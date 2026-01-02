-- Adaptive planning v1: curricula, exercise pools, progress state, reflections (with RLS)

-- Track curricula: versioned, per track
create table if not exists public.plan_track_curricula (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_track_id uuid not null references public.plan_tracks(id) on delete cascade,
  status text not null default 'active' check (status in ('draft','active','archived')),
  version int not null default 1,
  curriculum_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_track_id, version)
);

create index if not exists plan_track_curricula_user_track_idx
on public.plan_track_curricula (user_id, plan_track_id);

create trigger plan_track_curricula_set_updated_at
before update on public.plan_track_curricula
for each row execute function public.set_updated_at();

alter table public.plan_track_curricula enable row level security;

create policy "plan_track_curricula_select_own"
on public.plan_track_curricula for select
using (auth.uid() = user_id);

create policy "plan_track_curricula_insert_own"
on public.plan_track_curricula for insert
with check (auth.uid() = user_id);

create policy "plan_track_curricula_update_own"
on public.plan_track_curricula for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "plan_track_curricula_delete_own"
on public.plan_track_curricula for delete
using (auth.uid() = user_id);

-- Track exercise pool: normalized exercises for scheduling
create table if not exists public.plan_track_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_track_id uuid not null references public.plan_tracks(id) on delete cascade,
  exercise_slug text not null,
  name text not null,
  block text not null check (block in ('warmup','review','new','apply')),
  minutes_default int not null default 5,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','easy','medium','hard')),
  tags text[] not null default '{}'::text[],
  instructions_md text not null default '',
  tab_text text not null default '',
  diagram_specs jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_track_id, exercise_slug)
);

create index if not exists plan_track_exercises_user_track_idx
on public.plan_track_exercises (user_id, plan_track_id);

create index if not exists plan_track_exercises_user_block_idx
on public.plan_track_exercises (user_id, block);

create trigger plan_track_exercises_set_updated_at
before update on public.plan_track_exercises
for each row execute function public.set_updated_at();

alter table public.plan_track_exercises enable row level security;

create policy "plan_track_exercises_select_own"
on public.plan_track_exercises for select
using (auth.uid() = user_id);

create policy "plan_track_exercises_insert_own"
on public.plan_track_exercises for insert
with check (auth.uid() = user_id);

create policy "plan_track_exercises_update_own"
on public.plan_track_exercises for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "plan_track_exercises_delete_own"
on public.plan_track_exercises for delete
using (auth.uid() = user_id);

-- Per-track progress state (hybrid progression knobs)
create table if not exists public.track_progress_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_track_id uuid not null references public.plan_tracks(id) on delete cascade,
  current_phase int not null default 1,
  day_in_phase int not null default 1,
  pace_multiplier float8 not null default 1.0,
  last_plan_date date,
  overrides_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_track_id)
);

create index if not exists track_progress_state_user_track_idx
on public.track_progress_state (user_id, plan_track_id);

create trigger track_progress_state_set_updated_at
before update on public.track_progress_state
for each row execute function public.set_updated_at();

alter table public.track_progress_state enable row level security;

create policy "track_progress_state_select_own"
on public.track_progress_state for select
using (auth.uid() = user_id);

create policy "track_progress_state_insert_own"
on public.track_progress_state for insert
with check (auth.uid() = user_id);

create policy "track_progress_state_update_own"
on public.track_progress_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "track_progress_state_delete_own"
on public.track_progress_state for delete
using (auth.uid() = user_id);

-- Post-session reflection (user feedback signal)
create table if not exists public.practice_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_session_id uuid not null references public.practice_sessions(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  session_date date not null default (now()::date),
  hard_notes text not null default '',
  easy_notes text not null default '',
  notes text not null default '',
  confidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (practice_session_id)
);

create index if not exists practice_reflections_user_date_idx
on public.practice_reflections (user_id, session_date);

create trigger practice_reflections_set_updated_at
before update on public.practice_reflections
for each row execute function public.set_updated_at();

alter table public.practice_reflections enable row level security;

create policy "practice_reflections_select_own"
on public.practice_reflections for select
using (auth.uid() = user_id);

create policy "practice_reflections_insert_own"
on public.practice_reflections for insert
with check (auth.uid() = user_id);

create policy "practice_reflections_update_own"
on public.practice_reflections for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "practice_reflections_delete_own"
on public.practice_reflections for delete
using (auth.uid() = user_id);

-- Optional: track ad-hoc requests (prompt + resulting plan)
create table if not exists public.ad_hoc_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_date date not null default (now()::date),
  prompt text not null default '',
  constraints_json jsonb not null default '{}'::jsonb,
  plan_id uuid references public.plans(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ad_hoc_requests_user_date_idx
on public.ad_hoc_requests (user_id, request_date);

alter table public.ad_hoc_requests enable row level security;

create policy "ad_hoc_requests_select_own"
on public.ad_hoc_requests for select
using (auth.uid() = user_id);

create policy "ad_hoc_requests_insert_own"
on public.ad_hoc_requests for insert
with check (auth.uid() = user_id);

create policy "ad_hoc_requests_update_own"
on public.ad_hoc_requests for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ad_hoc_requests_delete_own"
on public.ad_hoc_requests for delete
using (auth.uid() = user_id);

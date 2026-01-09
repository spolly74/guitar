-- V2 Schema: Learning Paths, Lessons, and Chat
-- This is a clean V2 implementation

-- Learning Paths (replaces plan_tracks for V2)
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  goal text not null default '',
  plan jsonb,                    -- LearningPlan JSON (phases/days)
  plan_status text not null default 'draft' check (plan_status in ('draft','approved','in_progress','completed','paused')),
  current_phase int not null default 1,
  current_day int not null default 1,
  total_days int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  adaptation_history jsonb not null default '[]'::jsonb
);

create trigger learning_paths_set_updated_at
before update on public.learning_paths
for each row execute function public.set_updated_at();

create index if not exists learning_paths_user_id_idx on public.learning_paths(user_id);
create index if not exists learning_paths_user_status_idx on public.learning_paths(user_id, plan_status);

alter table public.learning_paths enable row level security;

create policy "learning_paths_select_own"
on public.learning_paths for select
using (auth.uid() = user_id);

create policy "learning_paths_insert_own"
on public.learning_paths for insert
with check (auth.uid() = user_id);

create policy "learning_paths_update_own"
on public.learning_paths for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "learning_paths_delete_own"
on public.learning_paths for delete
using (auth.uid() = user_id);

-- Lessons (unified: Learning Path days + Quick Practice)
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Source: either from a Learning Path OR Quick Practice (not both)
  learning_path_id uuid references public.learning_paths(id) on delete cascade,
  day_number int,

  -- Quick Practice specific
  is_quick_practice boolean not null default false,
  prompt text,                   -- Original user prompt (for quick practice)
  saved boolean not null default false,  -- User explicitly saved
  converted_to_path_id uuid references public.learning_paths(id) on delete set null,

  -- Lesson content
  title text not null default '',
  content jsonb not null default '{}'::jsonb,  -- LessonV2 JSON

  -- Tracking
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  feedback jsonb  -- difficulty, flags, notes
);

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create index if not exists lessons_user_id_idx on public.lessons(user_id);
create index if not exists lessons_learning_path_idx on public.lessons(learning_path_id);
create index if not exists lessons_user_quick_practice_idx on public.lessons(user_id, is_quick_practice) where is_quick_practice = true;
create index if not exists lessons_user_saved_idx on public.lessons(user_id, saved) where saved = true;

-- Unique constraint: one lesson per day per learning path
create unique index if not exists lessons_path_day_uq
on public.lessons (learning_path_id, day_number)
where learning_path_id is not null;

alter table public.lessons enable row level security;

create policy "lessons_select_own"
on public.lessons for select
using (auth.uid() = user_id);

create policy "lessons_insert_own"
on public.lessons for insert
with check (auth.uid() = user_id);

create policy "lessons_update_own"
on public.lessons for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "lessons_delete_own"
on public.lessons for delete
using (auth.uid() = user_id);

-- Chat threads (multiple per lesson, supports "New Chat" feature)
create table if not exists public.lesson_chat_threads (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,                    -- Auto-generated or user-provided
  is_active boolean not null default true,  -- Current thread for this lesson
  created_at timestamptz not null default now(),
  archived_at timestamptz        -- When user started a new chat
);

create index if not exists lesson_chat_threads_lesson_idx on public.lesson_chat_threads(lesson_id);
create index if not exists lesson_chat_threads_user_idx on public.lesson_chat_threads(user_id);

alter table public.lesson_chat_threads enable row level security;

create policy "lesson_chat_threads_select_own"
on public.lesson_chat_threads for select
using (auth.uid() = user_id);

create policy "lesson_chat_threads_insert_own"
on public.lesson_chat_threads for insert
with check (auth.uid() = user_id);

create policy "lesson_chat_threads_update_own"
on public.lesson_chat_threads for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "lesson_chat_threads_delete_own"
on public.lesson_chat_threads for delete
using (auth.uid() = user_id);

-- Chat messages within threads
create table if not exists public.lesson_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.lesson_chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  diagrams jsonb,                -- Any diagrams generated in response
  diagram_replacement jsonb,     -- If this message replaced a lesson diagram
  created_at timestamptz not null default now()
);

create index if not exists lesson_chat_messages_thread_idx on public.lesson_chat_messages(thread_id);
create index if not exists lesson_chat_messages_user_idx on public.lesson_chat_messages(user_id);

alter table public.lesson_chat_messages enable row level security;

create policy "lesson_chat_messages_select_own"
on public.lesson_chat_messages for select
using (auth.uid() = user_id);

create policy "lesson_chat_messages_insert_own"
on public.lesson_chat_messages for insert
with check (auth.uid() = user_id);

create policy "lesson_chat_messages_update_own"
on public.lesson_chat_messages for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "lesson_chat_messages_delete_own"
on public.lesson_chat_messages for delete
using (auth.uid() = user_id);

-- Exercise completions for V2 lessons
create table if not exists public.lesson_exercise_completions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,     -- ID within the lesson content
  completed boolean not null default false,
  minutes_spent int,
  notes text not null default '',
  difficulty_feedback text check (difficulty_feedback in ('too_easy', 'just_right', 'too_hard')),
  flagged boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, exercise_id)
);

create trigger lesson_exercise_completions_set_updated_at
before update on public.lesson_exercise_completions
for each row execute function public.set_updated_at();

create index if not exists lesson_exercise_completions_lesson_idx on public.lesson_exercise_completions(lesson_id);
create index if not exists lesson_exercise_completions_user_idx on public.lesson_exercise_completions(user_id);

alter table public.lesson_exercise_completions enable row level security;

create policy "lesson_exercise_completions_select_own"
on public.lesson_exercise_completions for select
using (auth.uid() = user_id);

create policy "lesson_exercise_completions_insert_own"
on public.lesson_exercise_completions for insert
with check (auth.uid() = user_id);

create policy "lesson_exercise_completions_update_own"
on public.lesson_exercise_completions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "lesson_exercise_completions_delete_own"
on public.lesson_exercise_completions for delete
using (auth.uid() = user_id);

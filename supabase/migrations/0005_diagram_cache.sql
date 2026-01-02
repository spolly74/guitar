-- Cache deterministic diagram SVG output keyed by spec hash (per user).

create table if not exists public.diagram_svgs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spec_hash text not null,
  diagram_type text not null default 'fretboard',
  style text not null,
  spec_json jsonb not null,
  svg text not null,
  created_at timestamptz not null default now(),
  unique (user_id, spec_hash)
);

create index if not exists diagram_svgs_user_hash_idx
on public.diagram_svgs (user_id, spec_hash);

alter table public.diagram_svgs enable row level security;

create policy "diagram_svgs_select_own"
on public.diagram_svgs for select
using (auth.uid() = user_id);

create policy "diagram_svgs_insert_own"
on public.diagram_svgs for insert
with check (auth.uid() = user_id);

create policy "diagram_svgs_update_own"
on public.diagram_svgs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "diagram_svgs_delete_own"
on public.diagram_svgs for delete
using (auth.uid() = user_id);

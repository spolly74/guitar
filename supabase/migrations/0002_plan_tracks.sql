-- Add plan tracks (overall plans) and allow multiple plans per user per day.

-- Plan tracks represent higher-level learning plans (program / song / technique).
create table if not exists public.plan_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'program' check (kind in ('program','song','technique','other')),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plan_tracks_set_updated_at
before update on public.plan_tracks
for each row execute function public.set_updated_at();

alter table public.plan_tracks enable row level security;

create policy "plan_tracks_select_own"
on public.plan_tracks for select
using (auth.uid() = user_id);

create policy "plan_tracks_insert_own"
on public.plan_tracks for insert
with check (auth.uid() = user_id);

create policy "plan_tracks_update_own"
on public.plan_tracks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "plan_tracks_delete_own"
on public.plan_tracks for delete
using (auth.uid() = user_id);

-- Attach daily plans to a track (optional for backwards compatibility).
alter table public.plans
add column if not exists plan_track_id uuid references public.plan_tracks(id) on delete set null;

create index if not exists plans_plan_track_id_idx on public.plans(plan_track_id);

-- Drop the old uniqueness constraint enforcing one plan per user per day.
-- We don't know the auto-generated constraint name, so remove any UNIQUE(user_id, plan_date) constraint dynamically.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.plans'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (user_id, plan_date)'
  loop
    execute format('alter table public.plans drop constraint %I', c.conname);
  end loop;
end $$;

-- New rule: one plan per (user, track, date). Multiple tracks => multiple plans per day.
create unique index if not exists plans_user_track_date_uq
on public.plans (user_id, plan_track_id, plan_date)
where plan_track_id is not null;

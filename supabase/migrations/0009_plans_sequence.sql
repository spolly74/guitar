-- Allow multiple lessons per learning path per day by introducing a plan sequence.

alter table public.plans
add column if not exists sequence int not null default 1;

-- Backfill existing rows defensively (should already default).
update public.plans set sequence = 1 where sequence is null;

-- Drop the old unique index enforcing one plan per (user, track, date).
drop index if exists public.plans_user_track_date_uq;

-- New rule: one lesson per (user, track, date, sequence). Sequence starts at 1.
create unique index if not exists plans_user_track_date_sequence_uq
on public.plans (user_id, plan_track_id, plan_date, sequence)
where plan_track_id is not null;

create index if not exists plans_user_date_sequence_idx
on public.plans (user_id, plan_date, sequence);

-- Prevent duplicate exercise logs for the same session + exercise.

-- If plan_id is present, uniqueness is per (session, plan, block, slug).
create unique index if not exists exercise_logs_session_plan_block_slug_uq
on public.exercise_logs (practice_session_id, plan_id, block, exercise_slug)
where plan_id is not null;

-- If plan_id is NULL (ad-hoc), uniqueness is per (session, block, slug).
create unique index if not exists exercise_logs_session_block_slug_ad_hoc_uq
on public.exercise_logs (practice_session_id, block, exercise_slug)
where plan_id is null;

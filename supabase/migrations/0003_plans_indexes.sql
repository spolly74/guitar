-- Helpful indexes for common plan queries (today view, plan lists)

create index if not exists plans_user_date_idx
on public.plans (user_id, plan_date);

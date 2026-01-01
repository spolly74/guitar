# Guitar Practice App

Specs live in `specs/`. The web app is a Next.js App Router project in `apps/web/`.

## Local dev (web)

1) Create a Supabase project and enable Email / Magic Link auth.

2) Configure redirect URLs in Supabase Auth:
- `http://localhost:3000/auth/callback`

3) Create env file:
- Copy `apps/web/env.example` to `apps/web/.env.local` and fill in:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4) Start Next.js:

```bash
cd apps/web
npm run dev
```

## Database schema + RLS

SQL migrations are in `supabase/migrations/` (includes `pgvector` + RLS policies).

Notes:
- Daily plans live in `public.plans`
- Higher-level “tracks” (program / song / technique) live in `public.plan_tracks`, and `plans.plan_track_id` associates daily plans to a track.
- Ad-hoc one-off plans are supported by leaving `plans.plan_track_id` as `NULL` (these are not part of any track).

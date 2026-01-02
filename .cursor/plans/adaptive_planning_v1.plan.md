# Adaptive, AI-Enabled Learning Paths (v1)

## Goals
- Make daily plans **change over time** (not repeat), while staying **predictable** and **adjustable**.
- Use **hybrid progression**: time-based phases by default, but user feedback can slow/accelerate.
- Capture feedback via **Follow-ups + End-of-session Reflection** and feed it back into scheduling.
- Add **AI-assisted wizards** for creating:
  - new tracks (e.g. Punk Rock)
  - ad-hoc one-off plans (guided prompt)

## Key design
- **Deterministic scheduler** decides *what to practice* from data (curriculum phases + exercise pool + recent history).
- **LLM is bounded**: used to help generate/adjust curricula and to write human-friendly instructions, but the scheduler enforces constraints (4 blocks, ≥30 min, difficulty caps).

```mermaid
flowchart TD
  user[User] -->|createTrack| trackWizard[TrackWizard]
  user -->|createAdHoc| adHocWizard[AdHocWizard]
  user -->|practice+reflect| reflection[PostSessionReflection]
  user -->|flag+notes| followups[FollowUps]

  trackWizard -->|openai_guided| curriculum[TrackCurriculum]
  adHocWizard -->|openai_guided| adHocCurriculum[AdHocCurriculum]

  curriculum --> scheduler[DeterministicScheduler]
  adHocCurriculum --> scheduler
  followups --> scheduler
  reflection --> scheduler
  history[ExerciseLogs+Plans] --> scheduler

  scheduler -->|PlanV1_json| plansTable[(plans.plan_json)]
  plansTable --> todayUI[TodayPage]
```

## LLM provider (OpenAI-only, model-configurable)
- **Provider**: OpenAI (same `OPENAI_API_KEY` already used for embeddings/vision).
- **Where the LLM is used (v1)**:
  - `TrackWizard`: generate a new track curriculum + initial exercise pool.
  - `AdHocWizard`: generate a 1–3 day mini-curriculum (or single-day intent) + initial exercises.
  - Optional: rewrite/wording for instructions.
- **Where the LLM is NOT used (v1)**:
  - The **daily plan selection** (scheduler) remains deterministic and guardrailed.
- **How it’s called**:
  - OpenAI **Chat Completions** with `response_format: { type: "json_object" }`
  - Temperature low (e.g. 0–0.3)
  - Output is **strict JSON only**; we **Zod-validate** and **hard-fail** on invalid/missing fields (no partial writes).
- **Model selection**:
  - Controlled by env var so you can switch without code changes:
    - `OPENAI_PLANNER_MODEL=gpt-4o-mini` (default)
    - later: `OPENAI_PLANNER_MODEL=gpt-4o` for harder planning

## Data model changes (Supabase)
Add new tables (all with `user_id`, timestamps, and RLS policies like existing tables):
- **`plan_track_curricula`**: per-track curriculum definition (phases/weeks, objectives, constraints).
- **`plan_track_exercises`**: normalized “exercise pool” for a track (tags, difficulty, block suitability, prerequisites).
- **`track_progress_state`**: per-track state (current phase/week, last advanced date, pace multiplier, manual overrides).
- **`practice_reflections`**: per practice session/day reflection (hard/easy notes, confidence sliders, time, pain points).
- (Optional) **`ad_hoc_requests`**: store the prompt/intent for an ad-hoc plan and its resulting generated plan link.

Files:
- Add new migrations under `supabase/migrations/0008_...sql` (tables + indexes + RLS).

## Track + ad-hoc wizards (LLM-bounded)
- **TrackWizard** (UI on `/plans`): asks a few questions and produces:
  - track goals
  - phase plan (weeks)
  - initial exercise pool
  - daily structure defaults
- **AdHocWizard** (UI on `/today` or `/plans`): asks for:
  - goal
  - time budget
  - constraints (what you already know, what’s hard)
  - outputs a mini-curriculum (1–3 days) or a single-day intent.

Implementation:
- Add API route(s) that call OpenAI and return **strict JSON** (validated with Zod) to write into curriculum/exercise tables.

## Deterministic scheduler (core)
Replace the current static `generatePlanV1()` usage with a scheduler that:
- Selects exercises by:
  - current phase/week
  - spaced repetition (recent logs)
  - open follow-ups (priority insertion)
  - reflection signals (e.g. “hard” => repeat, “easy” => progress)
- Ensures constraints:
  - all 4 blocks present
  - ≥30 minutes total
  - “New” is capped (e.g. 1 concept)
- Produces PlanV1 JSON and persists to `public.plans` (existing behavior)

Files to refactor:
- `apps/web/src/lib/plan/generate.ts` into:
  - `scheduler.ts` (deterministic selection)
  - `templates.ts` (exercise definitions / rendering text)
  - keep `apps/web/src/lib/plan/schema.ts` for strict validation
- Update `apps/web/src/lib/plan/service.ts` to use scheduler.

## Feedback loop
- **Follow-ups** already exist; extend UI to allow adding a short note/“why” and optionally a tag.
- Add a **Reflection form** at end of session (or on Today page):
  - “What felt hard/easy?”
  - confidence sliders per block
  - freeform note
- Scheduler reads these to adjust progression pace and what gets repeated.

## Rollout steps
1) Add schema + RLS migrations for curriculum/progress/reflections.
2) Implement TrackWizard + AdHocWizard that write curriculum/exercises.
3) Implement deterministic scheduler and swap it into `/api/plan/generate`.
4) Add reflection capture and wire scheduler to use reflection + follow-ups.
5) Iterate on defaults for “Beginner Jazz Guitar” curriculum.

## Acceptance criteria
- Daily plans for a track **change across days** (vary review/new/apply) while remaining consistent with the track’s curriculum.
- User feedback (follow-ups + reflection) measurably affects the next generated plan.
- New track creation wizard produces a usable curriculum/exercise pool and generates plans without manual DB edits.
- Ad-hoc wizard can generate a one-off plan that reflects the user’s stated goal.

## Implementation todos
- **db-curriculum-rls**: Add migrations for curriculum/exercises/progress/reflections with indexes + RLS.
- **track-wizard**: Add TrackWizard UI + API (strict JSON via OpenAI) to create curriculum/exercise pool.
- **adhoc-wizard**: Add AdHocWizard UI + API (strict JSON via OpenAI) to create an ad-hoc intent/curriculum and generate a plan.
- **scheduler-core**: Implement deterministic scheduler (hybrid progression) and integrate follow-ups + history signals.
- **plan-generator-swap**: Update `/api/plan/generate` to use scheduler instead of static generator; keep schema validation.
- **reflection-capture**: Add post-session reflection UI + persistence; feed signals into scheduler.

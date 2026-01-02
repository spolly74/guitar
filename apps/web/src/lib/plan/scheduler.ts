import type { PlanV1 } from "@/lib/plan/schema";
import { PlanV1Schema } from "@/lib/plan/schema";
import { sha256Hex, stableJsonStringify } from "@/lib/diagrams/stableHash";

type SupabaseLike = {
  from: (table: string) => any;
};

type TrackExerciseRow = {
  exercise_slug: string;
  name: string;
  block: "warmup" | "review" | "new" | "apply";
  minutes_default: number;
  difficulty: "beginner" | "easy" | "medium" | "hard";
  tags: string[];
  instructions_md: string;
  tab_text: string;
  diagram_specs: any[];
};

type ExerciseNoteRow = {
  exercise_slug: string;
  notes: string | null;
  created_at: string;
};

function hashIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  const h = sha256Hex(seed).slice(0, 8);
  const n = Number.parseInt(h, 16);
  return n % modulo;
}

function sumMinutes(plan: PlanV1) {
  return plan.today_blocks.reduce((acc, b) => acc + (b.minutes ?? 0), 0);
}

function todayBlocksFromItems(itemsByBlock: Record<string, any[]>) {
  const blocks: Array<"warmup" | "review" | "new" | "apply"> = [
    "warmup",
    "review",
    "new",
    "apply",
  ];

  return blocks.map((block) => {
    const items = itemsByBlock[block] ?? [];
    const minutes = items.reduce((acc, it) => acc + (it.minutes ?? 0), 0);
    return { block, minutes, items };
  });
}

async function getOrCreateProgressState(input: {
  supabase: SupabaseLike;
  userId: string;
  planTrackId: string;
}) {
  const existing = await input.supabase
    .from("track_progress_state")
    .select("id, current_phase, day_in_phase, pace_multiplier, last_plan_date")
    .eq("user_id", input.userId)
    .eq("plan_track_id", input.planTrackId)
    .limit(1)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) return existing.data;

  const inserted = await input.supabase
    .from("track_progress_state")
    .insert({
      user_id: input.userId,
      plan_track_id: input.planTrackId,
      current_phase: 1,
      day_in_phase: 1,
      pace_multiplier: 1.0,
    })
    .select("id, current_phase, day_in_phase, pace_multiplier, last_plan_date")
    .single();

  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data;
}

async function getActiveCurriculum(input: {
  supabase: SupabaseLike;
  userId: string;
  planTrackId: string;
}) {
  const res = await input.supabase
    .from("plan_track_curricula")
    .select("curriculum_json")
    .eq("user_id", input.userId)
    .eq("plan_track_id", input.planTrackId)
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (res.error && res.error.code !== "PGRST116") throw new Error(res.error.message);
  return (res.data?.curriculum_json ?? null) as any | null;
}

async function getExerciseLastSeenBySlug(input: {
  supabase: SupabaseLike;
  userId: string;
  planTrackId: string;
  daysLookback: number;
}) {
  // Use plans to restrict to this track, then join by plan_id.
  // PostgREST can't do server-side joins easily; approximate by looking at recent logs.
  const since = new Date(Date.now() - input.daysLookback * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const logs = await input.supabase
    .from("exercise_logs")
    .select("exercise_slug, created_at")
    .eq("user_id", input.userId)
    .gte("created_at", `${since}T00:00:00Z`)
    .order("created_at", { ascending: false })
    .limit(250);

  if (logs.error) throw new Error(logs.error.message);

  const map = new Map<string, string>();
  for (const row of logs.data ?? []) {
    if (!map.has(row.exercise_slug)) map.set(row.exercise_slug, row.created_at);
  }
  return map;
}

async function getRecentExerciseNotesForTrack(input: {
  supabase: SupabaseLike;
  userId: string;
  planTrackId: string;
  date: string; // YYYY-MM-DD
  sequence: number;
  daysLookback: number;
  limit: number;
}) {
  const since = new Date(Date.now() - input.daysLookback * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // 1) Prioritize notes from the most recent lesson BEFORE this one (same date, lower sequence).
  // This is the closest thing to "use the feedback from the last lesson".
  const prevPlan =
    input.sequence > 1
      ? await input.supabase
          .from("plans")
          .select("id, sequence")
          .eq("user_id", input.userId)
          .eq("plan_track_id", input.planTrackId)
          .eq("plan_date", input.date)
          .lt("sequence", input.sequence)
          .order("sequence", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null as any, error: null as any };

  if (prevPlan.error && prevPlan.error.code !== "PGRST116") {
    throw new Error(prevPlan.error.message);
  }

  const primaryPlanId = prevPlan.data?.id ? String(prevPlan.data.id) : null;

  const primaryLogs = primaryPlanId
    ? await input.supabase
        .from("exercise_logs")
        .select("exercise_slug, notes, created_at")
        .eq("user_id", input.userId)
        .eq("plan_id", primaryPlanId)
        .not("notes", "is", null)
        .neq("notes", "")
        .order("created_at", { ascending: false })
        .limit(input.limit)
    : { data: [] as any[], error: null as any };

  if (primaryLogs.error) throw new Error(primaryLogs.error.message);

  // 2) Then learn from the last 14 days: pull notes from recent lessons, de-duped by slug.
  const recentPlans = await input.supabase
    .from("plans")
    .select("id, plan_date, sequence")
    .eq("user_id", input.userId)
    .eq("plan_track_id", input.planTrackId)
    .gte("plan_date", since)
    .lte("plan_date", input.date)
    .order("plan_date", { ascending: false })
    .order("sequence", { ascending: false })
    .limit(25);

  if (recentPlans.error) throw new Error(recentPlans.error.message);
  const planIds = (recentPlans.data ?? [])
    .map((p: any) => p.id)
    .filter(Boolean)
    .map(String)
    .filter((id: string) => id !== primaryPlanId);

  const recentLogs =
    planIds.length > 0
      ? await input.supabase
          .from("exercise_logs")
          .select("exercise_slug, notes, created_at")
          .eq("user_id", input.userId)
          .in("plan_id", planIds)
          .not("notes", "is", null)
          .neq("notes", "")
          .order("created_at", { ascending: false })
          .limit(input.limit)
      : { data: [] as any[], error: null as any };

  if (recentLogs.error) throw new Error(recentLogs.error.message);

  // De-dupe by exercise slug, keep primary lesson notes first.
  const seen = new Set<string>();
  const out: ExerciseNoteRow[] = [];

  for (const row of (primaryLogs.data ?? []) as ExerciseNoteRow[]) {
    const slug = String(row.exercise_slug ?? "");
    const note = String(row.notes ?? "").trim();
    if (!slug || !note || seen.has(slug)) continue;
    seen.add(slug);
    out.push(row);
  }

  for (const row of (recentLogs.data ?? []) as ExerciseNoteRow[]) {
    const slug = String(row.exercise_slug ?? "");
    const note = String(row.notes ?? "").trim();
    if (!slug || !note || seen.has(slug)) continue;
    seen.add(slug);
    out.push(row);
  }

  return { rows: out, primary_count: (primaryLogs.data ?? []).length };
}

function formatNotesForPrompt(rows: ExerciseNoteRow[]) {
  const lines = rows
    .map((r) => {
      const note = String(r.notes ?? "").trim().replace(/\s+/g, " ");
      if (!note) return null;
      return `- ${r.exercise_slug}: ${note}`;
    })
    .filter(Boolean) as string[];
  if (lines.length === 0) return "";
  return ["Notes to address from recent lessons:", ...lines].join("\n");
}

export async function schedulePlanForTrack(input: {
  supabase: SupabaseLike;
  userId: string;
  planTrackId: string;
  date: string; // YYYY-MM-DD
  focusPrompt: string;
  sequence?: number;
}): Promise<{ plan: PlanV1; nextState: { current_phase: number; day_in_phase: number } }> {
  const exercisesRes = await input.supabase
    .from("plan_track_exercises")
    .select(
      "exercise_slug,name,block,minutes_default,difficulty,tags,instructions_md,tab_text,diagram_specs",
    )
    .eq("user_id", input.userId)
    .eq("plan_track_id", input.planTrackId)
    .eq("is_active", true);

  if (exercisesRes.error) throw new Error(exercisesRes.error.message);
  const exercises = (exercisesRes.data ?? []) as TrackExerciseRow[];

  if (exercises.length === 0) {
    throw new Error("Track has no exercises yet. Use the AI Track Wizard to seed it.");
  }

  const progress = await getOrCreateProgressState({
    supabase: input.supabase,
    userId: input.userId,
    planTrackId: input.planTrackId,
  });

  const curriculum = await getActiveCurriculum({
    supabase: input.supabase,
    userId: input.userId,
    planTrackId: input.planTrackId,
  });

  const phases: Array<{ phase: number; name: string; days: number; focus: string }> =
    curriculum?.phases ?? [];

  const currentPhase =
    typeof progress.current_phase === "number" ? progress.current_phase : 1;
  const dayInPhase = typeof progress.day_in_phase === "number" ? progress.day_in_phase : 1;

  const phaseDef = phases.find((p) => p.phase === currentPhase) ?? phases[0] ?? null;
  const phaseFocus = phaseDef?.focus ?? input.focusPrompt;

  const seq = input.sequence ?? 1;
  const recentNotesRes = await getRecentExerciseNotesForTrack({
    supabase: input.supabase,
    userId: input.userId,
    planTrackId: input.planTrackId,
    date: input.date,
    sequence: seq,
    daysLookback: 14,
    limit: 40,
  });
  const recentNotes = recentNotesRes.rows;
  const notedSlugs = new Set(recentNotes.map((r) => r.exercise_slug));
  const notesForPrompt = formatNotesForPrompt(recentNotes);

  const reflectionRes = await input.supabase
    .from("practice_reflections")
    .select("hard_notes, easy_notes")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reflectionRes.error && reflectionRes.error.code !== "PGRST116") {
    throw new Error(reflectionRes.error.message);
  }
  const lastHard = String(reflectionRes.data?.hard_notes ?? "").trim();
  const lastEasy = String(reflectionRes.data?.easy_notes ?? "").trim();

  const followupsRes = await input.supabase
    .from("follow_ups")
    .select("id, title")
    .eq("user_id", input.userId)
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(1);

  if (followupsRes.error) throw new Error(followupsRes.error.message);
  const followup = (followupsRes.data ?? [])[0] as { id: string; title: string } | undefined;

  const lastSeen = await getExerciseLastSeenBySlug({
    supabase: input.supabase,
    userId: input.userId,
    planTrackId: input.planTrackId,
    daysLookback: 14,
  });

  function pick(block: TrackExerciseRow["block"], opts?: { preferPhaseTag?: boolean }) {
    const candidates = exercises.filter((e) => e.block === block);
    if (candidates.length === 0) return null;

    let filtered = candidates;
    if (opts?.preferPhaseTag) {
      const tagged = candidates.filter((e) => e.tags?.includes(`phase:${currentPhase}`));
      if (tagged.length > 0) filtered = tagged;
    }

    // For review, if the user left notes on any exercises recently, bias toward those.
    if (block === "review" && notedSlugs.size > 0) {
      const noted = filtered.filter((e) => notedSlugs.has(e.exercise_slug));
      if (noted.length > 0) filtered = noted;
    }

    // Prefer items not seen recently.
    const sorted = [...filtered].sort((a, b) => {
      const aSeen = lastSeen.get(a.exercise_slug) ?? "";
      const bSeen = lastSeen.get(b.exercise_slug) ?? "";
      if (aSeen !== bSeen) return aSeen.localeCompare(bSeen); // older first
      return a.exercise_slug.localeCompare(b.exercise_slug);
    });

    const seq = input.sequence ?? 1;
    return sorted[
      hashIndex(`${input.planTrackId}:${input.date}:${seq}:${block}`, sorted.length)
    ]!;
  }

  const warmup = pick("warmup");
  const review = pick("review");
  const nextNew = pick("new", { preferPhaseTag: true });
  const apply = pick("apply", { preferPhaseTag: true });

  const itemsByBlock: Record<string, any[]> = {
    warmup: warmup
      ? [
          {
            exercise_slug: warmup.exercise_slug,
            name: warmup.name,
            minutes: warmup.minutes_default,
            instructions_md: warmup.instructions_md,
            tab_text: warmup.tab_text,
            diagram_specs: warmup.diagram_specs ?? [],
            concept_tags: warmup.tags ?? [],
            common_mistakes: [],
            success_criteria: [],
          },
        ]
      : [],
    review: [
      ...(followup
        ? [
            {
              exercise_slug: `followup-${followup.id}`,
              name: `Follow-up: ${followup.title}`,
              minutes: 5,
              instructions_md:
                "Work slowly and deliberately. Take notes on what still feels unclear.",
              tab_text: "",
              diagram_specs: [],
              concept_tags: ["follow-up"],
              common_mistakes: [],
              success_criteria: [],
            },
          ]
        : []),
      ...(review
        ? [
            {
              exercise_slug: review.exercise_slug,
              name: review.name,
              minutes: Math.max(5, review.minutes_default - (followup ? 2 : 0)),
              instructions_md: review.instructions_md,
              tab_text: review.tab_text,
              diagram_specs: review.diagram_specs ?? [],
              concept_tags: review.tags ?? [],
              common_mistakes: [],
              success_criteria: [],
            },
          ]
        : []),
    ],
    new: nextNew
      ? [
          {
            exercise_slug: nextNew.exercise_slug,
            name: nextNew.name,
            minutes: nextNew.minutes_default,
            instructions_md: nextNew.instructions_md,
            tab_text: nextNew.tab_text,
            diagram_specs: nextNew.diagram_specs ?? [],
            concept_tags: nextNew.tags ?? [],
            common_mistakes: [],
            success_criteria: [],
          },
        ]
      : [],
    apply: apply
      ? [
          {
            exercise_slug: apply.exercise_slug,
            name: apply.name,
            minutes: apply.minutes_default,
            instructions_md: apply.instructions_md,
            tab_text: apply.tab_text,
            diagram_specs: apply.diagram_specs ?? [],
            concept_tags: apply.tags ?? [],
            common_mistakes: [],
            success_criteria: [],
          },
        ]
      : [],
  };

  const plan: PlanV1 = {
    version: "1.0",
    date: input.date,
    title: "Daily Practice Plan",
    focus_prompt:
      [phaseFocus, notesForPrompt, lastHard ? `Hard: ${lastHard}` : "", lastEasy ? `Easy: ${lastEasy}` : ""]
        .filter(Boolean)
        .join("\n\n"),
    assumptions: {
      level: "beginner",
      daily_minutes_target: 30,
      instrument: "right-handed 6-string guitar",
      tuning: "EADGBE",
    },
    today_blocks: todayBlocksFromItems(itemsByBlock),
    review_logic: { include_open_followups: true, prefer_recent_days: 7 },
    sources: [
      {
        type: "scheduler",
        track_id: input.planTrackId,
        phase: currentPhase,
        day_in_phase: dayInPhase,
        seed: sha256Hex(
          stableJsonStringify({
            date: input.date,
            track: input.planTrackId,
            sequence: input.sequence ?? 1,
          }),
        ),
        notes_included: recentNotes.length,
        primary_notes_included: recentNotesRes.primary_count,
      },
    ],
  };

  // Top up to >= 30 minutes
  const total = sumMinutes(plan);
  if (total < 30 && plan.today_blocks[0]?.items?.[0]) {
    plan.today_blocks[0].items[0].minutes += 30 - total;
    plan.today_blocks[0].minutes = plan.today_blocks[0].items.reduce(
      (acc, it) => acc + it.minutes,
      0,
    );
  }

  // Compute next state (hybrid: time-based with simple guard)
  let nextPhase = currentPhase;
  let nextDay = dayInPhase + 1;
  if (phaseDef && nextDay > phaseDef.days) {
    // If the last reflection had "hard" notes and no "easy" notes, hold progression.
    const hold = lastHard.length > 0 && lastEasy.length === 0;
    if (!hold) {
      nextPhase = currentPhase + 1;
      nextDay = 1;
    } else {
      nextPhase = currentPhase;
      nextDay = phaseDef.days; // keep at end until user reports easing up
    }
  }

  return {
    plan: PlanV1Schema.parse(plan),
    nextState: { current_phase: nextPhase, day_in_phase: nextDay },
  };
}

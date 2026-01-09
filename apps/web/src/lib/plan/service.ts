import type { PlanV1 } from "@/lib/plan/schema";
import { generatePlanV1 } from "@/lib/plan/generate";
import { schedulePlanForTrack } from "@/lib/plan/scheduler";
import { generateLessonViaOrchestrator } from "@/lib/ai/dispatcher";
import {
  buildPromptForLearningPathDay,
  clampDay,
  coerceLearningPath14d,
  retitleLessonFromCurriculum,
} from "@/lib/plan/learningPathCompile";

type SupabaseLike = {
  from: (table: string) => any;
  rpc?: (fn: string, args: any) => any;
};

export async function generateAndPersistPlan(input: {
  supabase: SupabaseLike;
  userId: string;
  date: string; // YYYY-MM-DD
  focusPrompt: string;
  planTrackId: string | null;
  title?: string;
  mode?: "replace" | "next";
}): Promise<{ planId: string; plan: PlanV1 }> {
  let resolvedTitle = input.title;
  let scheduledNextState: { current_phase: number; day_in_phase: number } | null =
    null;
  const mode = input.mode ?? "replace";
  let sequence = 1;
  let trackMeta: { title: string; kind: string; description: string } | null = null;
  let learningDay: number | null = null;

  if (input.planTrackId) {
    const trackRes = await input.supabase
      .from("plan_tracks")
      .select("id, title, kind, description")
      .eq("user_id", input.userId)
      .eq("id", input.planTrackId)
      .limit(1)
      .maybeSingle();

    if (trackRes.error) throw new Error(trackRes.error.message);
    if (!trackRes.data?.id) throw new Error("Track not found");

    trackMeta = {
      title: String(trackRes.data.title ?? ""),
      kind: String(trackRes.data.kind ?? "program"),
      description: String(trackRes.data.description ?? ""),
    };

    resolvedTitle = resolvedTitle ?? `${trackRes.data.title}: Daily Practice Plan`;
  }

  // Determine sequence for track plans.
  if (input.planTrackId) {
    if (mode === "next") {
      const maxRes = await input.supabase
        .from("plans")
        .select("sequence")
        .eq("user_id", input.userId)
        .eq("plan_track_id", input.planTrackId)
        .eq("plan_date", input.date)
        .order("sequence", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxRes.error && maxRes.error.code !== "PGRST116") {
        throw new Error(maxRes.error.message);
      }
      sequence = (maxRes.data?.sequence ?? 0) + 1;
    } else {
      sequence = 1;
    }
  }

  // Generate: track plans use deterministic scheduler; ad-hoc uses the fallback generator.
  let plan: PlanV1;
  if (input.planTrackId) {
    // If the track has a stored 14-day learning path curriculum, generate today's lesson from Day N.
    const curRes = await input.supabase
      .from("plan_track_curricula")
      .select("curriculum_json")
      .eq("user_id", input.userId)
      .eq("plan_track_id", input.planTrackId)
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (curRes.error && curRes.error.code !== "PGRST116") {
      throw new Error(curRes.error.message);
    }

    const curriculumJson = (curRes.data?.curriculum_json ?? null) as any | null;
    const learningPath = coerceLearningPath14d(curriculumJson?.learning_path_14d);

    if (learningPath && typeof input.supabase.rpc === "function") {
      // Progress state day tracking lives in overrides_json.learning_day
      const stateRes = await input.supabase
        .from("track_progress_state")
        .select("id, last_plan_date, overrides_json, current_phase, day_in_phase, pace_multiplier")
        .eq("user_id", input.userId)
        .eq("plan_track_id", input.planTrackId)
        .limit(1)
        .maybeSingle();
      if (stateRes.error && stateRes.error.code !== "PGRST116") {
        throw new Error(stateRes.error.message);
      }
      const last = String(stateRes.data?.last_plan_date ?? "");
      const overrides = (stateRes.data?.overrides_json ?? {}) as any;
      const baseDay = Number(overrides.learning_day ?? 1);

      let day = 1;
      if (!stateRes.data?.id || !last) {
        day = 1;
      } else if (mode === "next") {
        day = baseDay + 1;
      } else if (last < input.date) {
        day = baseDay + 1;
      } else {
        day = baseDay;
      }
      day = clampDay(day, learningPath.total_days ?? 14);
      learningDay = day;

      const { dayTitle, userPrompt } = buildPromptForLearningPathDay({
        trackTitle: trackMeta?.title ?? "Learning path",
        trackKind: trackMeta?.kind ?? "program",
        trackGoal: trackMeta?.description ?? "",
        learningPath,
        day,
      });

      const lessonRes = await generateLessonViaOrchestrator({
        supabase: input.supabase as any,
        date: input.date,
        user_prompt: [userPrompt, "", input.focusPrompt].filter(Boolean).join("\n\n"),
      });

      plan = retitleLessonFromCurriculum({
        lesson: lessonRes.lesson,
        trackTitle: trackMeta?.title ?? "Learning path",
        day,
        dayTitle,
      }) as any;

      // Update progress day state (best-effort; never block plan creation).
      const nextOverrides = {
        ...overrides,
        learning_day: day,
        learning_total_days: learningPath.total_days ?? 14,
      };
      if (stateRes.data?.id) {
        void input.supabase
          .from("track_progress_state")
          .update({ overrides_json: nextOverrides, last_plan_date: input.date })
          .eq("user_id", input.userId)
          .eq("plan_track_id", input.planTrackId);
      } else {
        void input.supabase.from("track_progress_state").insert({
          user_id: input.userId,
          plan_track_id: input.planTrackId,
          current_phase: 1,
          day_in_phase: 1,
          pace_multiplier: 1.0,
          last_plan_date: input.date,
          overrides_json: nextOverrides,
        });
      }
    } else {
      // Fallback: deterministic scheduler.
      const scheduled = await schedulePlanForTrack({
        supabase: input.supabase,
        userId: input.userId,
        planTrackId: input.planTrackId,
        date: input.date,
        focusPrompt: input.focusPrompt,
        sequence,
      });
      plan = scheduled.plan;
      scheduledNextState = scheduled.nextState;
    }
  } else {
    // Ad-hoc generation stays simple for now.
    plan = generatePlanV1({
      date: input.date,
      focusPrompt: input.focusPrompt,
      followups: [],
    });
  }

  if (resolvedTitle) plan.title = resolvedTitle;

  // Track-aware: default behavior keeps sequence=1 upsert-like; "next" always inserts a new row.
  if (input.planTrackId && mode === "replace") {
    const existing = await input.supabase
      .from("plans")
      .select("id")
      .eq("user_id", input.userId)
      .eq("plan_track_id", input.planTrackId)
      .eq("plan_date", input.date)
      .eq("sequence", 1)
      .limit(1)
      .maybeSingle();

    if (existing.error && existing.error.code !== "PGRST116") {
      throw new Error(existing.error.message);
    }

    if (existing.data?.id) {
      const updated = await input.supabase
        .from("plans")
        .update({
          title: plan.title,
          focus_prompt: plan.focus_prompt,
          plan_json: plan,
        })
        .eq("id", existing.data.id)
        .select("id")
        .single();

      if (updated.error) throw new Error(updated.error.message);

      // Only advance progress state once per date. If re-generating for the same date, keep state.
      const state = await input.supabase
        .from("track_progress_state")
        .select("id, last_plan_date")
        .eq("user_id", input.userId)
        .eq("plan_track_id", input.planTrackId)
        .limit(1)
        .maybeSingle();
      if (!state.error) {
        const last = state.data?.last_plan_date as string | null | undefined;
        if ((!last || last < input.date) && scheduledNextState) {
          await input.supabase
            .from("track_progress_state")
            .update({
              current_phase: scheduledNextState.current_phase,
              day_in_phase: scheduledNextState.day_in_phase,
              last_plan_date: input.date,
            })
            .eq("user_id", input.userId)
            .eq("plan_track_id", input.planTrackId);
        }
      }
      return { planId: updated.data.id as string, plan };
    }
  }

  const inserted = await input.supabase
    .from("plans")
    .insert({
      user_id: input.userId,
      plan_date: input.date,
      title: plan.title,
      focus_prompt: plan.focus_prompt,
      plan_json: plan,
      plan_track_id: input.planTrackId,
      sequence,
    })
    .select("id")
    .single();

  if (inserted.error) throw new Error(inserted.error.message);

  // Initialize/advance progress state for new track plan rows.
  if (input.planTrackId && scheduledNextState) {
    const up = await input.supabase
      .from("track_progress_state")
      .upsert(
        {
          user_id: input.userId,
          plan_track_id: input.planTrackId,
          current_phase: scheduledNextState.current_phase,
          day_in_phase: scheduledNextState.day_in_phase,
          last_plan_date: input.date,
        },
        { onConflict: "plan_track_id" },
      );
    // Swallow state update errors to avoid blocking plan creation.
    void up;
  }

  return { planId: inserted.data.id as string, plan };
}

import type { PlanV1 } from "@/lib/plan/schema";
import { generatePlanV1 } from "@/lib/plan/generate";
import { schedulePlanForTrack } from "@/lib/plan/scheduler";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function generateAndPersistPlan(input: {
  supabase: SupabaseLike;
  userId: string;
  date: string; // YYYY-MM-DD
  focusPrompt: string;
  planTrackId: string | null;
  title?: string;
}): Promise<{ planId: string; plan: PlanV1 }> {
  let resolvedTitle = input.title;
  let scheduledNextState: { current_phase: number; day_in_phase: number } | null =
    null;

  if (input.planTrackId) {
    const trackRes = await input.supabase
      .from("plan_tracks")
      .select("id, title")
      .eq("user_id", input.userId)
      .eq("id", input.planTrackId)
      .limit(1)
      .maybeSingle();

    if (trackRes.error) throw new Error(trackRes.error.message);
    if (!trackRes.data?.id) throw new Error("Track not found");

    resolvedTitle = resolvedTitle ?? `${trackRes.data.title}: Daily Practice Plan`;
  }

  // Generate: track plans use deterministic scheduler; ad-hoc uses the fallback generator.
  let plan: PlanV1;
  if (input.planTrackId) {
    const scheduled = await schedulePlanForTrack({
      supabase: input.supabase,
      userId: input.userId,
      planTrackId: input.planTrackId,
      date: input.date,
      focusPrompt: input.focusPrompt,
    });
    plan = scheduled.plan;
    scheduledNextState = scheduled.nextState;
  } else {
    // Ad-hoc generation stays simple for now.
    plan = generatePlanV1({
      date: input.date,
      focusPrompt: input.focusPrompt,
      followups: [],
    });
  }

  if (resolvedTitle) plan.title = resolvedTitle;

  // Track-aware: upsert-like behavior by reading then update/insert.
  if (input.planTrackId) {
    const existing = await input.supabase
      .from("plans")
      .select("id")
      .eq("user_id", input.userId)
      .eq("plan_track_id", input.planTrackId)
      .eq("plan_date", input.date)
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

import { generatePlanV1 } from "@/lib/plan/generate";
import type { PlanV1 } from "@/lib/plan/schema";

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

  const followupsRes = await input.supabase
    .from("follow_ups")
    .select("id, title")
    .eq("user_id", input.userId)
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(1);

  if (followupsRes.error) throw new Error(followupsRes.error.message);

  const plan = generatePlanV1({
    date: input.date,
    focusPrompt: input.focusPrompt,
    followups: followupsRes.data ?? [],
  });

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
  return { planId: inserted.data.id as string, plan };
}

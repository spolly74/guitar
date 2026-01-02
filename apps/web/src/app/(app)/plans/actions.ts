"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateAndPersistPlan } from "@/lib/plan/service";
import { ensureBeginnerJazzTrack } from "@/lib/tracks/defaults";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return { supabase, user: data.user };
}

export async function createDefaultJazzTrack() {
  const { supabase, user } = await requireUser();
  await ensureBeginnerJazzTrack({ supabase, userId: user.id });

  revalidatePath("/plans");
}

export async function generateTodaysPlanForTrack(formData: FormData) {
  const planTrackId = String(formData.get("plan_track_id") ?? "").trim();
  if (!planTrackId) throw new Error("Missing plan_track_id");

  const { supabase, user } = await requireUser();
  const date = todayIsoDate();

  await generateAndPersistPlan({
    supabase,
    userId: user.id,
    date,
    focusPrompt:
      "Generate a beginner-friendly plan aligned to this track. Use chord symbols, tabs, and clear instructions (no standard notation).",
    planTrackId,
    title: "Daily Practice Plan",
  });

  revalidatePath("/plans");
  revalidatePath("/today");
}

export async function deleteTrackAndPlans(formData: FormData) {
  const trackId = String(formData.get("plan_track_id") ?? "").trim();
  if (!trackId) throw new Error("Missing plan_track_id");

  const { supabase, user } = await requireUser();

  const plansRes = await supabase
    .from("plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("plan_track_id", trackId);

  if (plansRes.error) throw new Error(plansRes.error.message);

  const planIds = (plansRes.data ?? []).map((p: { id: string }) => p.id);

  // Important: delete exercise logs first to avoid plan_id -> null uniqueness collisions.
  if (planIds.length > 0) {
    const logsDel = await supabase
      .from("exercise_logs")
      .delete()
      .eq("user_id", user.id)
      .in("plan_id", planIds);
    if (logsDel.error) throw new Error(logsDel.error.message);

    const plansDel = await supabase
      .from("plans")
      .delete()
      .eq("user_id", user.id)
      .eq("plan_track_id", trackId);
    if (plansDel.error) throw new Error(plansDel.error.message);
  }

  const trackDel = await supabase
    .from("plan_tracks")
    .delete()
    .eq("user_id", user.id)
    .eq("id", trackId);

  if (trackDel.error) throw new Error(trackDel.error.message);

  revalidatePath("/plans");
  revalidatePath("/today");
}

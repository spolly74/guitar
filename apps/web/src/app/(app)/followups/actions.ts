"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return { supabase, userId: data.user.id };
}

export async function markFollowupDone(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "done", snoozed_until: null })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function reopenFollowup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "open", snoozed_until: null })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function snoozeFollowup7Days(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + 7);
  const isoDate = snoozedUntil.toISOString().slice(0, 10);

  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "snoozed", snoozed_until: isoDate })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

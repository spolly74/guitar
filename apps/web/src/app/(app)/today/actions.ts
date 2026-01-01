"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlanBlockName, PlanV1 } from "@/lib/plan/types";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return { supabase, userId: data.user.id };
}

export async function createAdHocPlanForToday() {
  const { supabase, userId } = await requireUserId();
  const date = todayIsoDate();

  const stubPlan: PlanV1 = {
    version: "1.0",
    date,
    title: "Ad-hoc: Fretboard C chords",
    focus_prompt:
      "One-off lesson: find and play multiple C chord shapes across the neck (no standard notation).",
    assumptions: {
      level: "beginner",
      daily_minutes_target: 30,
      instrument: "right-handed 6-string guitar",
      tuning: "EADGBE",
    },
    today_blocks: [
      {
        block: "warmup",
        minutes: 5,
        items: [
          {
            exercise_slug: "warmup-finger-walk-1-2-3-4",
            name: "Finger walk (1–2–3–4) on strings 6–1",
            minutes: 5,
            instructions_md:
              "Go slow and clean. Use alternate picking. Keep fingers close to the frets.",
            tab_text:
              "e|----------------1-2-3-4-|\nB|----------1-2-3-4--------|\nG|----1-2-3-4--------------|\nD|1-2-3-4------------------|\nA|-------------------------|\nE|-------------------------|",
            diagram_specs: [],
            concept_tags: ["warmup", "fretting-hand", "alternate-picking"],
            common_mistakes: ["Rushing", "Buzzing notes", "Tension in thumb"],
            success_criteria: ["Even volume", "No buzzing", "Relaxed hands"],
          },
        ],
      },
      {
        block: "review",
        minutes: 10,
        items: [
          {
            exercise_slug: "review-shells-cmaj7-fmaj7",
            name: "Shells: Cmaj7 and Fmaj7 (R–3 and R–7)",
            minutes: 10,
            instructions_md:
              "Play 2 voicings of each. Listen for the 3rd and 7th clearly. Keep it light and steady.",
            tab_text:
              "Cmaj7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---4---|\nD|---2---|\nA|---3---|\nE|---x---|\n\nFmaj7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---2---|\nD|---3---|\nA|---x---|\nE|---1---|",
            diagram_specs: [],
            concept_tags: ["shell-voicings", "maj7"],
            common_mistakes: ["Gripping too hard", "Letting notes ring messily"],
            success_criteria: ["Clean chord tones", "Steady time"],
          },
        ],
      },
      {
        block: "new",
        minutes: 10,
        items: [
          {
            exercise_slug: "new-c-chords-across-neck",
            name: "Find 4 different C chord shapes across the neck",
            minutes: 10,
            instructions_md:
              "Pick 4 C-family shapes (C, C6, Cmaj7). Play each for 4 slow strums. Say the root note location out loud.",
            tab_text:
              "C (open):\n\ne|---0---|\nB|---1---|\nG|---0---|\nD|---2---|\nA|---3---|\nE|---x---|\n\nC (A-shape barre @ 3rd):\n\ne|---3---|\nB|---5---|\nG|---5---|\nD|---5---|\nA|---3---|\nE|---x---|",
            diagram_specs: [],
            concept_tags: ["fretboard", "triads", "chord-shapes"],
            common_mistakes: ["Not knowing where the root is", "Sloppy muting"],
            success_criteria: ["Can point to root", "Clean strums"],
          },
        ],
      },
      {
        block: "apply",
        minutes: 5,
        items: [
          {
            exercise_slug: "apply-ii-v-i-in-c-comping",
            name: "Apply: ii–V–I in C (Dm7–G7–Cmaj7) comping",
            minutes: 5,
            instructions_md:
              "Use shell voicings. Play 4 bars of each chord, then loop. Keep quarter notes.",
            tab_text:
              "Dm7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---5---|\nD|---3---|\nA|---5---|\nE|---x---|\n\nG7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---4---|\nD|---3---|\nA|---5---|\nE|---3---|\n\nCmaj7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---4---|\nD|---2---|\nA|---3---|\nE|---x---|",
            diagram_specs: [],
            concept_tags: ["ii-v-i", "comping", "shell-voicings"],
            common_mistakes: ["Changing chords late", "Unsteady time"],
            success_criteria: ["Smooth transitions", "Steady quarter notes"],
          },
        ],
      },
    ],
    review_logic: {
      include_open_followups: true,
      prefer_recent_days: 7,
    },
    sources: [],
  };

  const { error } = await supabase.from("plans").insert({
    user_id: userId,
    plan_date: date,
    title: stubPlan.title,
    focus_prompt: stubPlan.focus_prompt,
    plan_json: stubPlan,
    plan_track_id: null,
  });

  if (error) throw new Error(error.message);
}

async function getOrCreateTodaySessionId(userId: string) {
  const { supabase } = await requireUserId();
  const date = todayIsoDate();

  const existing = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("session_date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id;

  const inserted = await supabase
    .from("practice_sessions")
    .insert({
      user_id: userId,
      session_date: date,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data.id as string;
}

export async function saveExerciseLog(input: {
  planId: string | null;
  block: PlanBlockName;
  exerciseSlug: string;
  name: string;
  completed: boolean;
  minutes: number;
  notes: string;
  flaggedForFollowup: boolean;
}) {
  const { supabase, userId } = await requireUserId();
  const sessionId = await getOrCreateTodaySessionId(userId);

  const baseQuery = supabase
    .from("exercise_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("practice_session_id", sessionId)
    .eq("block", input.block)
    .eq("exercise_slug", input.exerciseSlug);

  const existing = input.planId
    ? await baseQuery.eq("plan_id", input.planId).maybeSingle()
    : await baseQuery.is("plan_id", null).maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    // PGRST116 = "Results contain 0 rows" for maybeSingle
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) {
    const { error } = await supabase
      .from("exercise_logs")
      .update({
        completed: input.completed,
        minutes: input.minutes,
        notes: input.notes,
        flagged_for_followup: input.flaggedForFollowup,
        name: input.name,
      })
      .eq("id", existing.data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("exercise_logs").insert({
      user_id: userId,
      practice_session_id: sessionId,
      plan_id: input.planId,
      block: input.block,
      exercise_slug: input.exerciseSlug,
      name: input.name,
      completed: input.completed,
      minutes: input.minutes,
      notes: input.notes,
      flagged_for_followup: input.flaggedForFollowup,
    });
    if (error) throw new Error(error.message);
  }

  if (input.flaggedForFollowup) {
    const followupQuery = supabase
      .from("follow_ups")
      .select("id")
      .eq("user_id", userId)
      .eq("source_exercise_slug", input.exerciseSlug)
      .in("status", ["open", "snoozed"])
      .limit(1);

    const existingFollowup = input.planId
      ? await followupQuery.eq("source_plan_id", input.planId).maybeSingle()
      : await followupQuery.is("source_plan_id", null).maybeSingle();

    if (!existingFollowup.data?.id) {
      const { error } = await supabase.from("follow_ups").insert({
        user_id: userId,
        source_plan_id: input.planId,
        source_exercise_slug: input.exerciseSlug,
        title: input.name,
        status: "open",
        notes: "",
      });
      if (error) throw new Error(error.message);
    }
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateAndPersistPlan } from "@/lib/plan/service";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    date?: string;
    focus_prompt?: string;
    plan_track_id?: string | null;
    title?: string;
    mode?: "replace" | "next";
  };

  const date = body.date ?? todayIsoDate();
  const focusPrompt =
    body.focus_prompt ??
    (body.plan_track_id
      ? "Generate a beginner-friendly plan aligned to this track. Use chord symbols, tabs, and clear instructions (no standard notation)."
      : "Beginner jazz guitar: shell voicings + ii–V–I + steady comping time feel.");
  const planTrackId =
    body.plan_track_id === undefined ? null : body.plan_track_id;
  const mode = body.mode ?? "replace";

  try {
    const { planId, plan } = await generateAndPersistPlan({
      supabase,
      userId: userRes.user.id,
      date,
      focusPrompt,
      planTrackId,
      title: body.title,
      mode,
    });

    return NextResponse.json({
      ok: true,
      plan_id: planId,
      plan_track_id: planTrackId,
      mode,
      date,
      plan,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message, plan_track_id: planTrackId, date },
      { status: 500 },
    );
  }
}

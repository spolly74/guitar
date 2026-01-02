import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runTrackWizard } from "@/lib/openai/planner";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | null
    | {
        title?: string;
        kind?: "program" | "song" | "technique" | "other";
        goal?: string;
        minutesPerDay?: number;
      };

  const title = (body?.title ?? "").trim();
  const kind = body?.kind ?? "program";
  const goal = (body?.goal ?? "").trim();
  const minutesPerDay = Number(body?.minutesPerDay ?? 30);

  if (!title || !goal) {
    return NextResponse.json({ ok: false, error: "Missing title or goal" }, { status: 400 });
  }

  try {
    const generated = await runTrackWizard({
      title,
      kind,
      goal,
      minutesPerDay,
    });

    // Create track
    const trackRes = await supabase
      .from("plan_tracks")
      .insert({
        user_id: userId,
        title,
        kind,
        description: goal,
      })
      .select("id")
      .single();
    if (trackRes.error) throw new Error(trackRes.error.message);
    const trackId = trackRes.data.id as string;

    // Store curriculum
    const curRes = await supabase.from("plan_track_curricula").insert({
      user_id: userId,
      plan_track_id: trackId,
      status: "active",
      version: 1,
      curriculum_json: generated.curriculum,
    });
    if (curRes.error) throw new Error(curRes.error.message);

    // Store exercises
    const rows = generated.exercises.map((e) => ({
      user_id: userId,
      plan_track_id: trackId,
      exercise_slug: slugify(e.exercise_slug || e.name),
      name: e.name,
      block: e.block,
      minutes_default: e.minutes_default,
      difficulty: e.difficulty ?? "beginner",
      tags: Array.from(new Set([...(e.tags ?? []), `phase:${e.phase ?? 1}`])),
      instructions_md: e.instructions_md ?? "",
      tab_text: e.tab_text ?? "",
      diagram_specs: e.diagram_specs ?? [],
      is_active: true,
    }));

    const exRes = await supabase.from("plan_track_exercises").insert(rows);
    if (exRes.error) throw new Error(exRes.error.message);

    return NextResponse.json({
      ok: true,
      plan_track_id: trackId,
      exercise_count: rows.length,
      phase_count: generated.curriculum.phases.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: msg.includes("exercises")
          ? "Track generator returned too few exercises. Please try again."
          : msg,
      },
      { status: 500 },
    );
  }
}

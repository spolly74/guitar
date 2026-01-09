import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PlanV1Schema } from "@/lib/plan/schema";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Save a generated lesson to Today as an ad-hoc plan (plan_track_id = null).
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as null | { plan?: unknown };
  if (!body?.plan) {
    return NextResponse.json({ ok: false, error: "Missing plan" }, { status: 400 });
  }

  const plan = PlanV1Schema.parse(body.plan);
  const date = todayIsoDate();

  // Force the saved plan to be for today (and ensure the embedded JSON matches).
  const planJson = PlanV1Schema.parse({ ...plan, date });

  const inserted = await supabase
    .from("plans")
    .insert({
      user_id: userRes.user.id,
      plan_date: date,
      title: planJson.title,
      focus_prompt: planJson.focus_prompt,
      plan_json: planJson,
      plan_track_id: null,
      sequence: 1,
    })
    .select("id")
    .single();

  if (inserted.error) {
    return NextResponse.json({ ok: false, error: inserted.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan_id: inserted.data.id });
}

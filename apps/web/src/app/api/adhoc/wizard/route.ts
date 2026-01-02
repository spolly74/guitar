import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateAndPersistPlan } from "@/lib/plan/service";
import { runAdHocWizard } from "@/lib/openai/planner";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
    | { prompt?: string; minutes?: number };

  const prompt = (body?.prompt ?? "").trim();
  const minutes = Number(body?.minutes ?? 30);

  if (!prompt) {
    return NextResponse.json({ ok: false, error: "Missing prompt" }, { status: 400 });
  }

  try {
    const adhoc = await runAdHocWizard({ prompt, minutes });
    const date = todayIsoDate();

    const { planId } = await generateAndPersistPlan({
      supabase,
      userId,
      date,
      focusPrompt: adhoc.focus_prompt,
      planTrackId: null,
      title: `Ad-hoc: ${adhoc.title}`,
    });

    const reqRes = await supabase.from("ad_hoc_requests").insert({
      user_id: userId,
      request_date: date,
      prompt,
      constraints_json: { minutes },
      plan_id: planId,
    });
    if (reqRes.error) throw new Error(reqRes.error.message);

    return NextResponse.json({ ok: true, plan_id: planId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

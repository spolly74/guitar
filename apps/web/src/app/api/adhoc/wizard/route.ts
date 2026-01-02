import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PlanV1Schema } from "@/lib/plan/schema";
import { runAdHocLessonPlan } from "@/lib/openai/planner";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function ensureAllBlocks(input: {
  today_blocks: Array<{
    block: "warmup" | "review" | "new" | "apply";
    minutes: number;
    items: any[];
  }>;
}) {
  const by = new Map<string, { block: any; minutes: number; items: any[] }>();
  for (const b of input.today_blocks ?? []) by.set(b.block, b);
  const blocks: Array<"warmup" | "review" | "new" | "apply"> = [
    "warmup",
    "review",
    "new",
    "apply",
  ];
  return blocks.map((block) => by.get(block) ?? { block, minutes: 0, items: [] });
}

function sumMinutes(blocks: Array<{ minutes: number }>) {
  return blocks.reduce((acc, b) => acc + (b.minutes ?? 0), 0);
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
    const adhoc = await runAdHocLessonPlan({ prompt, minutes });
    const date = todayIsoDate();

    let blocks = ensureAllBlocks({ today_blocks: adhoc.today_blocks ?? [] });

    // Ensure block minutes match item minutes; then adjust total to requested minutes.
    blocks = blocks.map((b) => {
      const m = (b.items ?? []).reduce((acc: number, it: any) => acc + (it.minutes ?? 0), 0);
      return { ...b, minutes: m };
    });

    const total = sumMinutes(blocks);
    const target = minutes;
    if (total !== target) {
      const firstNonEmpty = blocks.find((b) => (b.items?.length ?? 0) > 0);
      if (firstNonEmpty && firstNonEmpty.items[0]) {
        const delta = target - total;
        firstNonEmpty.items[0].minutes = Math.max(0, Number(firstNonEmpty.items[0].minutes ?? 0) + delta);
      }
      // Recompute minutes after adjustment.
      blocks = blocks.map((b) => {
        const m = (b.items ?? []).reduce((acc: number, it: any) => acc + (it.minutes ?? 0), 0);
        return { ...b, minutes: m };
      });
    }

    const planJson = PlanV1Schema.parse({
      version: "1.0",
      date,
      title: `Ad-hoc: ${adhoc.title}`,
      focus_prompt: adhoc.focus_prompt,
      assumptions: {
        level: "beginner",
        daily_minutes_target: minutes,
        instrument: "right-handed 6-string guitar",
        tuning: "EADGBE",
      },
      today_blocks: blocks,
      review_logic: { include_open_followups: true, prefer_recent_days: 7 },
      sources: [
        {
          type: "adhoc_wizard",
          prompt,
          minutes,
        },
      ],
    });

    const inserted = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        plan_date: date,
        title: planJson.title,
        focus_prompt: planJson.focus_prompt,
        plan_json: planJson,
        plan_track_id: null,
        sequence: 1,
      })
      .select("id")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    const planId = inserted.data.id as string;

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

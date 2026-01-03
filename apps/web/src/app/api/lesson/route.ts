import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LessonV1Schema } from "@/lib/lesson/schema";
import { generatePlaceholderLessonV1 } from "@/lib/lesson/generatePlaceholder";
import { generateLessonViaOrchestrator } from "@/lib/ai/dispatcher";
import { storeGeneratedArtifactsBestEffort } from "@/lib/ai/storeGenerated";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Phase 0/1: placeholder single-agent lesson generator (no AI yet).
// Returns structured JSON only; UI renders it deterministically.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | null
    | { date?: string; prompt?: string };
  const date = String(body?.date ?? todayIsoDate()).slice(0, 10);
  const prompt = String(body?.prompt ?? "").trim();

  try {
    const lesson =
      prompt.length > 0
        ? (await generateLessonViaOrchestrator({ supabase, date, user_prompt: prompt })).lesson
        : LessonV1Schema.parse(generatePlaceholderLessonV1({ date }));

    if (prompt.length > 0) {
      // Phase 5: optionally store generated artifacts into the knowledge base (best-effort).
      await storeGeneratedArtifactsBestEffort({
        supabase,
        userId: data.user.id,
        lesson,
        theory: (lesson.sources ?? []).find((s: any) => s?.type === "guitar_theory_v1"),
      });
    }

    return NextResponse.json({ ok: true, lesson, meta: { prompt } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateQuickPracticeLesson } from "@/lib/ai/lessonGeneratorV2";

const CreateQuickPracticeSchema = z.object({
  prompt: z.string().min(3).max(500),
  estimated_minutes: z.number().int().min(10).max(60).optional(),
});

// POST /api/quick-practice - Generate a quick practice lesson
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateQuickPracticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { prompt, estimated_minutes } = parsed.data;

  try {
    // Generate the lesson
    const content = await generateQuickPracticeLesson({
      prompt,
      estimatedMinutes: estimated_minutes,
    });

    // Save to database
    const { data: lesson, error: insertError } = await supabase
      .from("lessons")
      .insert({
        user_id: user.id,
        learning_path_id: null,
        day_number: null,
        is_quick_practice: true,
        prompt,
        saved: false,
        content,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create initial chat thread
    await supabase.from("lesson_chat_threads").insert({
      lesson_id: lesson.id,
      is_active: true,
    });

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Quick practice generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

// GET /api/quick-practice - Get active quick practice lessons (unsaved)
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_quick_practice", true)
    .eq("saved", false)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lessons: lessons ?? [] });
}

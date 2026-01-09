import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/quick-practice/[id]/save - Save a quick practice lesson to history
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify lesson exists and belongs to user
  const { data: lesson, error: fetchError } = await supabase
    .from("lessons")
    .select("id, is_quick_practice")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!lesson.is_quick_practice) {
    return NextResponse.json(
      { error: "Only quick practice lessons can be saved" },
      { status: 400 }
    );
  }

  // Mark as saved
  const { data: updated, error: updateError } = await supabase
    .from("lessons")
    .update({ saved: true })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ lesson: updated });
}

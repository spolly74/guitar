import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { LearningPlan, AdaptationEvent } from "@/lib/schemas/v2.schema";

const CompleteDaySchema = z.object({
  lesson_id: z.string().uuid(),
  difficulty_feedback: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
  notes: z.string().optional(),
  flagged_exercises: z.array(z.string()).optional(),
});

// POST /api/paths/[id]/complete-day - Mark the current day as complete
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CompleteDaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { lesson_id, difficulty_feedback, notes, flagged_exercises } = parsed.data;

  // Get the learning path
  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (pathError) {
    if (pathError.code === "PGRST116") {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }
    return NextResponse.json({ error: pathError.message }, { status: 500 });
  }

  if (path.plan_status !== "in_progress") {
    return NextResponse.json(
      { error: "Path is not in progress" },
      { status: 400 }
    );
  }

  // Mark the lesson as complete
  const { error: lessonError } = await supabase
    .from("lessons")
    .update({
      completed_at: new Date().toISOString(),
      feedback: {
        difficulty: difficulty_feedback,
        notes,
        flagged_exercises,
      },
    })
    .eq("id", lesson_id)
    .eq("learning_path_id", id)
    .eq("user_id", user.id);

  if (lessonError) {
    return NextResponse.json({ error: lessonError.message }, { status: 500 });
  }

  const plan = path.plan as LearningPlan;
  const currentDay = path.current_day;
  const totalDays = plan.estimated_days;

  // Check if this was the last day
  if (currentDay >= totalDays) {
    // Complete the path
    await supabase
      .from("learning_paths")
      .update({
        plan_status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      completed: true,
      message: "Congratulations! You've completed the learning path.",
    });
  }

  // Advance to the next day
  const nextDay = currentDay + 1;

  // Determine the new phase
  let newPhase = path.current_phase;
  for (const phase of plan.phases) {
    for (const day of phase.days) {
      if (day.day_number === nextDay) {
        newPhase = phase.number;
        break;
      }
    }
  }

  // Record adaptation event if there was difficult feedback
  const adaptationHistory = (path.adaptation_history || []) as AdaptationEvent[];
  if (difficulty_feedback && difficulty_feedback !== "just_right") {
    adaptationHistory.push({
      timestamp: new Date().toISOString(),
      trigger: "user_feedback",
      description: `Day ${currentDay} marked as ${difficulty_feedback}`,
      changes_made: "Feedback recorded for future adaptation",
    });
  }

  // Update the path
  const { data: updatedPath, error: updateError } = await supabase
    .from("learning_paths")
    .update({
      current_day: nextDay,
      current_phase: newPhase,
      adaptation_history: adaptationHistory,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    completed: false,
    path: updatedPath,
    next_day: nextDay,
  });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import type { LearningPlan, LessonV2Content } from "@/lib/schemas/v2.schema";

// POST /api/paths/[id]/lesson - Generate the next lesson for a learning path
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

  // Get the learning path
  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (pathError) {
    if (pathError.code === "PGRST116") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: pathError.message }, { status: 500 });
  }

  if (!["approved", "in_progress"].includes(path.plan_status)) {
    return NextResponse.json(
      { error: "Path must be approved or in progress to generate lessons" },
      { status: 400 }
    );
  }

  const plan = path.plan as LearningPlan;
  if (!plan?.phases) {
    return NextResponse.json(
      { error: "Invalid plan structure" },
      { status: 400 }
    );
  }

  const currentDay = path.current_day;

  // Check if lesson already exists for this day
  const { data: existingLesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("learning_path_id", id)
    .eq("day_number", currentDay)
    .single();

  if (existingLesson) {
    return NextResponse.json(
      { error: "Lesson already exists for this day", lesson_id: existingLesson.id },
      { status: 400 }
    );
  }

  // Find the day info from the plan
  let dayInfo: { day_number: number; title: string; focus: string; estimated_minutes: number } | null = null;
  let currentPhaseInfo: { number: number; title: string; objective: string } | null = null;

  for (const phase of plan.phases) {
    for (const day of phase.days) {
      if (day.day_number === currentDay) {
        dayInfo = day;
        currentPhaseInfo = { number: phase.number, title: phase.title, objective: phase.objective };
        break;
      }
    }
    if (dayInfo) break;
  }

  if (!dayInfo) {
    // Path is complete
    await supabase
      .from("learning_paths")
      .update({ plan_status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(
      { error: "Learning path completed", completed: true },
      { status: 400 }
    );
  }

  // Generate lesson content
  // For now, create a basic structure. In production, this would use AI to generate full content.
  const lessonContent: LessonV2Content = {
    version: "2.0",
    id: uuidv4(),
    learning_path_id: id,
    day_number: currentDay,
    date: new Date().toISOString().split("T")[0],
    title: dayInfo.title,
    objective: `${currentPhaseInfo?.title ? `[${currentPhaseInfo.title}] ` : ""}${dayInfo.focus}`,
    prerequisites: currentDay > 1 ? [`Complete Day ${currentDay - 1}`] : [],
    blocks: [
      {
        id: uuidv4(),
        type: "warmup",
        title: "Warm Up",
        minutes: 5,
        sections: [],
        exercises: [
          {
            id: uuidv4(),
            name: "Finger Stretches",
            instructions_md: "Warm up your fingers with gentle stretches.",
            minutes: 5,
            diagrams: [],
            success_criteria: ["Fingers feel loose and ready"],
            common_mistakes: [],
          },
        ],
      },
      {
        id: uuidv4(),
        type: "concept",
        title: dayInfo.title,
        minutes: Math.floor(dayInfo.estimated_minutes * 0.6),
        sections: [
          {
            type: "text",
            content: `Today's focus: ${dayInfo.focus}`,
          },
        ],
        exercises: [
          {
            id: uuidv4(),
            name: "Main Exercise",
            instructions_md: `Practice the concepts from today's lesson: ${dayInfo.focus}`,
            minutes: Math.floor(dayInfo.estimated_minutes * 0.4),
            diagrams: [],
            success_criteria: ["Understand the core concept", "Can demonstrate the technique"],
            common_mistakes: [],
          },
        ],
      },
      {
        id: uuidv4(),
        type: "apply",
        title: "Application",
        minutes: Math.floor(dayInfo.estimated_minutes * 0.3),
        sections: [],
        exercises: [
          {
            id: uuidv4(),
            name: "Practice Application",
            instructions_md: "Apply what you learned in a musical context.",
            minutes: Math.floor(dayInfo.estimated_minutes * 0.3),
            diagrams: [],
            success_criteria: ["Can use the technique in context"],
            common_mistakes: [],
          },
        ],
      },
    ],
    key_takeaways: [`Today you learned: ${dayInfo.focus}`],
    next_preview:
      currentDay < plan.estimated_days
        ? `Tomorrow: Continue building on ${dayInfo.title}`
        : "You've completed the learning path!",
    difficulty_rating: 2,
    estimated_minutes: dayInfo.estimated_minutes,
  };

  // Insert the lesson
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .insert({
      user_id: user.id,
      learning_path_id: id,
      day_number: currentDay,
      title: lessonContent.title,
      content: lessonContent,
      is_quick_practice: false,
    })
    .select()
    .single();

  if (lessonError) {
    return NextResponse.json({ error: lessonError.message }, { status: 500 });
  }

  // Update path status to in_progress if it was approved
  if (path.plan_status === "approved") {
    await supabase
      .from("learning_paths")
      .update({
        plan_status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  return NextResponse.json({ lesson }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runLearningPathPlannerV2 } from "@/lib/ai/learningPathPlannerV2";
import { z } from "zod";

// GET /api/paths - List user's learning paths
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: paths, error } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ paths });
}

const CreatePathSchema = z.object({
  topic: z.string().min(1).max(500),
  goals: z.string().optional(),
  skill_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  available_minutes_per_day: z.number().int().min(10).max(180).optional(),
  max_days: z.number().int().min(7).max(30).optional(),
});

// POST /api/paths - Create a new learning path
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check path limit (max 20)
  const { count, error: countError } = await supabase
    .from("learning_paths")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("plan_status", ["draft", "approved", "in_progress", "paused"]);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: "Maximum of 20 active learning paths reached" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreatePathSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;

  try {
    // Generate the learning plan using AI
    const plannerOutput = await runLearningPathPlannerV2({
      topic: input.topic,
      goals: input.goals,
      skill_level: input.skill_level,
      available_minutes_per_day: input.available_minutes_per_day,
      max_days: input.max_days,
    });

    // Insert the new learning path
    const { data: path, error: insertError } = await supabase
      .from("learning_paths")
      .insert({
        user_id: user.id,
        title: plannerOutput.title,
        description: plannerOutput.description,
        goal: plannerOutput.goal,
        plan: plannerOutput.plan,
        plan_status: "draft",
        total_days: plannerOutput.plan.estimated_days,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ path }, { status: 201 });
  } catch (err) {
    console.error("Error creating learning path:", err);
    return NextResponse.json(
      { error: "Failed to generate learning plan" },
      { status: 500 }
    );
  }
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonV2Content, LearningPlan } from "@/lib/schemas/v2.schema";
import { TodayClient } from "./TodayClient";

export const dynamic = "force-dynamic";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const date = todayIsoDate();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Get active learning paths
  const { data: activePaths } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("user_id", userId)
    .in("plan_status", ["in_progress", "approved"])
    .order("started_at", { ascending: false });

  // Get today's lessons for active paths
  const pathIds = (activePaths ?? []).map((p) => p.id);
  const { data: pathLessons } = pathIds.length > 0
    ? await supabase
        .from("lessons")
        .select("*")
        .eq("user_id", userId)
        .in("learning_path_id", pathIds)
        .gte("created_at", `${date}T00:00:00`)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Get active quick practice lessons (unsaved, not completed)
  const { data: quickPracticeLessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("user_id", userId)
    .eq("is_quick_practice", true)
    .eq("saved", false)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  // Build the data structure for the client
  const activePathsWithLessons = (activePaths ?? []).map((path) => {
    const plan = path.plan as LearningPlan | null;
    const todayLesson = (pathLessons ?? []).find(
      (l) => l.learning_path_id === path.id
    );

    // Find current day info from plan
    let currentDayInfo = null;
    if (plan) {
      for (const phase of plan.phases) {
        for (const day of phase.days) {
          if (day.day_number === path.current_day) {
            currentDayInfo = {
              dayNumber: day.day_number,
              title: day.title,
              focus: day.focus,
              estimatedMinutes: day.estimated_minutes,
              phaseTitle: phase.title,
              phaseObjective: phase.objective,
            };
            break;
          }
        }
        if (currentDayInfo) break;
      }
    }

    return {
      id: path.id,
      title: path.title,
      description: path.description,
      goal: path.goal,
      status: path.plan_status as "approved" | "in_progress",
      currentDay: path.current_day,
      totalDays: path.total_days,
      currentPhase: path.current_phase,
      currentDayInfo,
      todayLesson: todayLesson
        ? {
            id: todayLesson.id,
            content: todayLesson.content as LessonV2Content,
            completedAt: todayLesson.completed_at,
          }
        : null,
    };
  });

  const quickPractice = (quickPracticeLessons ?? []).map((lesson) => ({
    id: lesson.id,
    prompt: lesson.prompt,
    content: lesson.content as LessonV2Content,
    createdAt: lesson.created_at,
  }));

  return (
    <TodayClient
      date={date}
      activePaths={activePathsWithLessons}
      quickPracticeLessons={quickPractice}
    />
  );
}

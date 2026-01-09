import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonV2Content } from "@/lib/schemas/v2.schema";
import { HistoryClient } from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Get completed learning path lessons
  const { data: pathLessons } = await supabase
    .from("lessons")
    .select("*, learning_path:learning_paths(title)")
    .eq("user_id", userId)
    .not("learning_path_id", "is", null)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50);

  // Get saved quick practice lessons
  const { data: savedLessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("user_id", userId)
    .eq("is_quick_practice", true)
    .eq("saved", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const lessons = [
    ...(pathLessons ?? []).map((l) => ({
      id: l.id,
      title: (l.content as LessonV2Content).title,
      type: "learning_path" as const,
      pathTitle: (l.learning_path as { title: string } | null)?.title ?? null,
      dayNumber: l.day_number,
      completedAt: l.completed_at,
      createdAt: l.created_at,
      estimatedMinutes: (l.content as LessonV2Content).estimated_minutes,
    })),
    ...(savedLessons ?? []).map((l) => ({
      id: l.id,
      title: (l.content as LessonV2Content).title,
      type: "quick_practice" as const,
      pathTitle: null,
      dayNumber: null,
      completedAt: l.completed_at,
      createdAt: l.created_at,
      estimatedMinutes: (l.content as LessonV2Content).estimated_minutes,
    })),
  ].sort((a, b) => {
    const dateA = new Date(a.completedAt ?? a.createdAt);
    const dateB = new Date(b.completedAt ?? b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  return <HistoryClient lessons={lessons} />;
}

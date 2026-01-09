import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonV2Content } from "@/lib/schemas/v2.schema";
import { LessonViewV2 } from "@/components/LessonViewV2";

export const dynamic = "force-dynamic";

export default async function HistoryLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("*, learning_path:learning_paths(title)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !lesson) {
    notFound();
  }

  const content = lesson.content as LessonV2Content;
  const pathTitle = (lesson.learning_path as { title: string } | null)?.title ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to History
        </Link>

        {pathTitle && (
          <div className="text-sm text-zinc-500">
            From: <span className="font-medium text-zinc-700">{pathTitle}</span>
          </div>
        )}
      </div>

      <LessonViewV2
        lessonId={lesson.id}
        lesson={content}
        isQuickPractice={lesson.is_quick_practice}
        showChat={true}
      />
    </div>
  );
}

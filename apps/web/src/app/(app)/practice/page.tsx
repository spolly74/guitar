import { LessonV1Schema } from "@/lib/schemas/lesson.schema";
import { generatePlaceholderLessonV1 } from "@/lib/lesson/generatePlaceholder";
import { PracticeClient } from "@/app/(app)/practice/PracticeClient";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const date = new Date().toISOString().slice(0, 10);
  const lesson = LessonV1Schema.parse(generatePlaceholderLessonV1({ date }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <p className="text-sm text-zinc-600">
          Phases 0–1: schema-driven lesson rendering with deterministic diagrams.
        </p>
      </div>

      <PracticeClient initialLesson={lesson} />
    </div>
  );
}

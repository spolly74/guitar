import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LessonV1Schema } from "@/lib/lesson/schema";
import { generatePlaceholderLessonV1 } from "@/lib/lesson/generatePlaceholder";
import { ChordDiagram } from "@/app/(app)/today/ChordDiagram";
import { isChordSpec } from "@/lib/diagrams/chordSpec";

export const dynamic = "force-dynamic";

export default async function LessonDemoPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  // `(app)` layout already redirects, but keep this page safe if reused.
  if (!data.user) {
    return null;
  }

  const date = new Date().toISOString().slice(0, 10);
  const lesson = LessonV1Schema.parse(generatePlaceholderLessonV1({ date }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Lesson demo</h1>
        <p className="text-sm text-zinc-600">
          Renders a static JSON lesson with deterministic SVG chord diagrams (no AI).
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-lg font-semibold">{lesson.title}</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
          {lesson.focus_prompt}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {lesson.today_blocks.map((block) => (
          <section
            key={block.block}
            className="rounded-lg border border-zinc-200 bg-white p-6"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="text-base font-semibold capitalize">{block.block}</div>
              <div className="text-sm text-zinc-600">{block.minutes} min</div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {block.items.map((it) => (
                <div key={it.exercise_slug} className="rounded-md border border-zinc-200 p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="text-sm font-semibold">{it.name}</div>
                    <div className="text-xs text-zinc-600">{it.minutes} min</div>
                  </div>

                  {it.instructions_md ? (
                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                      {it.instructions_md}
                    </div>
                  ) : null}

                  {Array.isArray(it.diagram_specs) && it.diagram_specs.length > 0 ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {it.diagram_specs
                        .filter(isChordSpec)
                        .map((spec, idx) => (
                          <div key={`${it.exercise_slug}:chord:${idx}`} className="flex flex-col gap-2">
                            {spec.title ? (
                              <div className="text-xs font-medium text-zinc-700">{spec.title}</div>
                            ) : null}
                            <ChordDiagram spec={spec} />
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

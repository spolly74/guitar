"use client";

import type { LessonV1 } from "@/lib/schemas/lesson.schema";
import { DiagramRenderer } from "@/components/DiagramRenderer";

export function LessonView(props: { lesson: LessonV1 }) {
  const lesson = props.lesson;

  return (
    <div className="flex flex-col gap-4">
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
                <div
                  key={it.exercise_slug}
                  className="rounded-md border border-zinc-200 p-4"
                >
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
                      {it.diagram_specs.map((spec, idx) => (
                        <div
                          key={`${it.exercise_slug}:diagram:${idx}`}
                          className="overflow-x-auto rounded-md border border-zinc-200 bg-white"
                        >
                          <DiagramRenderer spec={spec as any} />
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

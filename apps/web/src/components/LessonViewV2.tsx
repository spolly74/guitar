"use client";

import { useState } from "react";
import type { LessonV2Content, DiagramSpec } from "@/lib/schemas/v2.schema";
import { DiagramRenderer } from "@/components/chat/DiagramRenderer";
import { LessonChat } from "@/components/chat/LessonChat";

interface LessonViewV2Props {
  lessonId: string;
  lesson: LessonV2Content;
  showChat?: boolean;
  onComplete?: () => void;
  onSave?: () => void;
  isQuickPractice?: boolean;
}

export function LessonViewV2({
  lessonId,
  lesson,
  showChat = true,
  onComplete,
  onSave,
  isQuickPractice = false,
}: LessonViewV2Props) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const totalExercises = lesson.blocks.reduce((sum, b) => sum + b.exercises.length, 0);
  const completedCount = completedExercises.size;
  const progress = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  function toggleExercise(exerciseId: string) {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{lesson.title}</h1>
              {lesson.day_number && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  Day {lesson.day_number}
                </span>
              )}
              {isQuickPractice && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                  Quick Practice
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-600">{lesson.objective}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span>{lesson.estimated_minutes} minutes</span>
              <span>{lesson.blocks.length} sections</span>
              <span>{totalExercises} exercises</span>
            </div>

            {/* Progress bar */}
            {totalExercises > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Progress</span>
                  <span>
                    {completedCount}/{totalExercises} exercises ({progress}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {showChat && (
              <button
                onClick={() => setIsChatOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      {lesson.prerequisites.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-medium text-amber-900">Prerequisites</div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
            {lesson.prerequisites.map((prereq, i) => (
              <li key={i}>{prereq}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-6">
        {lesson.blocks.map((block) => (
          <LessonBlock
            key={block.id}
            block={block}
            completedExercises={completedExercises}
            onToggleExercise={toggleExercise}
          />
        ))}
      </div>

      {/* Key Takeaways */}
      {lesson.key_takeaways.length > 0 && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="text-sm font-medium text-green-900">Key Takeaways</div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-green-800">
            {lesson.key_takeaways.map((takeaway, i) => (
              <li key={i}>{takeaway}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Preview */}
      {lesson.next_preview && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-sm font-medium text-zinc-700">Coming Next</div>
          <p className="mt-1 text-sm text-zinc-600">{lesson.next_preview}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {onComplete && progress === 100 && (
          <button
            onClick={onComplete}
            className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700"
          >
            Complete Lesson
          </button>
        )}
        {onSave && isQuickPractice && (
          <button
            onClick={onSave}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Save to History
          </button>
        )}
      </div>

      {/* Chat Panel */}
      <LessonChat
        lessonId={lessonId}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}

const BLOCK_COLORS = {
  warmup: { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-900" },
  concept: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-900" },
  practice: { border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-900" },
  apply: { border: "border-green-200", bg: "bg-green-50", text: "text-green-900" },
  review: { border: "border-zinc-200", bg: "bg-zinc-50", text: "text-zinc-900" },
};

function LessonBlock({
  block,
  completedExercises,
  onToggleExercise,
}: {
  block: LessonV2Content["blocks"][0];
  completedExercises: Set<string>;
  onToggleExercise: (id: string) => void;
}) {
  const colors = BLOCK_COLORS[block.type] || BLOCK_COLORS.review;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className={`rounded-lg border ${colors.border} bg-white overflow-hidden`}>
      <div
        className={`flex cursor-pointer items-center justify-between px-6 py-4 ${colors.bg}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`text-base font-semibold ${colors.text} capitalize`}>
            {block.title}
          </div>
          <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium">
            {block.type}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">{block.minutes} min</span>
          <svg
            className={`h-5 w-5 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 py-4">
          {/* Sections */}
          {block.sections.length > 0 && (
            <div className="space-y-4">
              {block.sections.map((section, i) => (
                <ContentSection key={i} section={section} />
              ))}
            </div>
          )}

          {/* Exercises */}
          {block.exercises.length > 0 && (
            <div className={`${block.sections.length > 0 ? "mt-6" : ""} space-y-4`}>
              {block.exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  isCompleted={completedExercises.has(exercise.id)}
                  onToggle={() => onToggleExercise(exercise.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ContentSection({ section }: { section: LessonV2Content["blocks"][0]["sections"][0] }) {
  if (section.type === "text" && typeof section.content === "string") {
    return (
      <div className="prose prose-sm max-w-none text-zinc-700">
        <p className="whitespace-pre-wrap">{section.content}</p>
      </div>
    );
  }

  if (section.type === "tip" && typeof section.content === "string") {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-800">{section.content}</p>
        </div>
      </div>
    );
  }

  if (section.type === "warning" && typeof section.content === "string") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800">{section.content}</p>
        </div>
      </div>
    );
  }

  if (
    (section.type === "chord_diagram" ||
      section.type === "fretboard_diagram" ||
      section.type === "tablature") &&
    typeof section.content === "object"
  ) {
    return <DiagramRenderer diagram={section.content as DiagramSpec} />;
  }

  return null;
}

function ExerciseCard({
  exercise,
  isCompleted,
  onToggle,
}: {
  exercise: LessonV2Content["blocks"][0]["exercises"][0];
  isCompleted: boolean;
  onToggle: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`rounded-lg border ${
        isCompleted ? "border-green-200 bg-green-50/50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            isCompleted
              ? "border-green-500 bg-green-500 text-white"
              : "border-zinc-300 bg-white"
          }`}
        >
          {isCompleted && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className={`font-medium ${isCompleted ? "text-green-900" : "text-zinc-900"}`}>
              {exercise.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{exercise.minutes} min</span>
              <svg
                className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-100 px-4 py-3">
          <div className="prose prose-sm max-w-none text-zinc-700">
            <div className="whitespace-pre-wrap">{exercise.instructions_md}</div>
          </div>

          {/* Diagrams */}
          {exercise.diagrams.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {exercise.diagrams.map((diagram, i) => (
                <DiagramRenderer key={i} diagram={diagram} />
              ))}
            </div>
          )}

          {/* Tablature */}
          {exercise.tablature && (
            <div className="mt-4">
              <DiagramRenderer diagram={exercise.tablature} />
            </div>
          )}

          {/* Success Criteria */}
          {exercise.success_criteria.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-zinc-500">Success Criteria</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-zinc-600">
                {exercise.success_criteria.map((criterion, i) => (
                  <li key={i}>{criterion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {exercise.common_mistakes.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-amber-600">Common Mistakes</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-amber-700">
                {exercise.common_mistakes.map((mistake, i) => (
                  <li key={i}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

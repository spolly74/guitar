"use client";

import { useState } from "react";
import type { LessonV2Content, DiagramSpec } from "@/lib/schemas/v2.schema";
import { DiagramRenderer } from "@/components/chat/DiagramRenderer";
import { LessonChat } from "@/components/chat/LessonChat";
import {
  ChatCircle,
  CheckCircle,
  CaretDown,
  Fire,
  Lightbulb,
  Barbell,
  Target,
  ListChecks,
  Info,
  Warning,
  BookmarkSimple,
  Check,
  Clock,
  ListBullets,
} from "@phosphor-icons/react";

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
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {lesson.title}
              </h1>
              {lesson.day_number && (
                <span className="rounded-full bg-background-subtle px-2.5 py-0.5 text-xs font-medium text-foreground-muted">
                  Day {lesson.day_number}
                </span>
              )}
              {isQuickPractice && (
                <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
                  Quick Practice
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-foreground-muted">{lesson.objective}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <Clock weight="regular" className="h-3.5 w-3.5" />
                {lesson.estimated_minutes} minutes
              </span>
              <span className="flex items-center gap-1.5">
                <ListBullets weight="regular" className="h-3.5 w-3.5" />
                {lesson.blocks.length} sections
              </span>
              <span className="flex items-center gap-1.5">
                <Target weight="regular" className="h-3.5 w-3.5" />
                {totalExercises} exercises
              </span>
            </div>

            {/* Progress bar */}
            {totalExercises > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Progress</span>
                  <span className="font-medium text-foreground">
                    {completedCount}/{totalExercises} exercises ({progress}%)
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
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
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-background-subtle"
              >
                <ChatCircle weight="regular" className="h-4 w-4" />
                Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      {lesson.prerequisites.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/20 bg-warning-subtle p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <Warning weight="fill" className="h-4 w-4" />
            Prerequisites
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground-muted">
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
        <div className="mt-8 rounded-xl border border-success/20 bg-success-subtle p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <Lightbulb weight="fill" className="h-4 w-4" />
            Key Takeaways
          </div>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-foreground-muted">
            {lesson.key_takeaways.map((takeaway, i) => (
              <li key={i}>{takeaway}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Preview */}
      {lesson.next_preview && (
        <div className="mt-6 rounded-xl border border-border bg-background-subtle p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Target weight="regular" className="h-4 w-4 text-foreground-muted" />
            Coming Next
          </div>
          <p className="mt-2 text-sm text-foreground-muted">{lesson.next_preview}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {onComplete && progress === 100 && (
          <button
            onClick={onComplete}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-success px-5 text-sm font-medium text-white transition-colors hover:bg-success/90"
          >
            <CheckCircle weight="fill" className="h-4 w-4" />
            Complete Lesson
          </button>
        )}
        {onSave && isQuickPractice && (
          <button
            onClick={onSave}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-background-subtle"
          >
            <BookmarkSimple weight="regular" className="h-4 w-4" />
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

const BLOCK_CONFIG = {
  warmup: {
    icon: Fire,
    label: "Warm-up",
    headerBg: "bg-orange-50",
    headerBorder: "border-orange-100",
    iconColor: "text-orange-500",
  },
  concept: {
    icon: Lightbulb,
    label: "Concept",
    headerBg: "bg-blue-50",
    headerBorder: "border-blue-100",
    iconColor: "text-blue-500",
  },
  practice: {
    icon: Barbell,
    label: "Practice",
    headerBg: "bg-violet-50",
    headerBorder: "border-violet-100",
    iconColor: "text-violet-500",
  },
  apply: {
    icon: Target,
    label: "Apply",
    headerBg: "bg-emerald-50",
    headerBorder: "border-emerald-100",
    iconColor: "text-emerald-500",
  },
  review: {
    icon: ListChecks,
    label: "Review",
    headerBg: "bg-background-subtle",
    headerBorder: "border-border",
    iconColor: "text-foreground-muted",
  },
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
  const config = BLOCK_CONFIG[block.type] || BLOCK_CONFIG.review;
  const Icon = config.icon;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={`flex cursor-pointer items-center justify-between px-5 py-4 ${config.headerBg} border-b ${config.headerBorder}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`${config.iconColor}`}>
            <Icon weight="duotone" className="h-5 w-5" />
          </div>
          <div className="font-medium text-foreground">{block.title}</div>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-foreground-muted">
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground-muted">{block.minutes} min</span>
          <CaretDown
            weight="bold"
            className={`h-4 w-4 text-foreground-muted transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 py-5">
          {/* Sections */}
          {block.sections.length > 0 && (
            <SectionsRenderer sections={block.sections} />
          )}

          {/* Exercises */}
          {block.exercises.length > 0 && (
            <div className={`${block.sections.length > 0 ? "mt-6" : ""} space-y-3`}>
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

type Section = LessonV2Content["blocks"][0]["sections"][0];

function SectionsRenderer({ sections }: { sections: Section[] }) {
  const groups: Array<{ type: "diagrams" | "other"; items: Section[] }> = [];

  for (const section of sections) {
    const isDiagram =
      section.type === "chord_diagram" ||
      section.type === "fretboard_diagram" ||
      section.type === "tablature";

    if (isDiagram) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.type === "diagrams") {
        lastGroup.items.push(section);
      } else {
        groups.push({ type: "diagrams", items: [section] });
      }
    } else {
      groups.push({ type: "other", items: [section] });
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        if (group.type === "diagrams") {
          const isAllChords = group.items.every((s) => s.type === "chord_diagram");
          const gridCols = isAllChords ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";
          return (
            <div key={groupIndex} className={`grid gap-3 ${gridCols}`}>
              {group.items.map((section, i) => (
                <DiagramRenderer
                  key={i}
                  diagram={section.content as DiagramSpec}
                />
              ))}
            </div>
          );
        } else {
          return group.items.map((section, i) => (
            <ContentSection key={`${groupIndex}-${i}`} section={section} />
          ));
        }
      })}
    </div>
  );
}

function ContentSection({ section }: { section: LessonV2Content["blocks"][0]["sections"][0] }) {
  if (section.type === "text" && typeof section.content === "string") {
    return (
      <div className="prose prose-sm max-w-none text-foreground-muted">
        <p className="whitespace-pre-wrap">{section.content}</p>
      </div>
    );
  }

  if (section.type === "tip" && typeof section.content === "string") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success-subtle p-4">
        <Info weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="text-sm text-foreground-muted">{section.content}</p>
      </div>
    );
  }

  if (section.type === "warning" && typeof section.content === "string") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning-subtle p-4">
        <Warning weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-sm text-foreground-muted">{section.content}</p>
      </div>
    );
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
      className={`rounded-xl border transition-colors ${
        isCompleted
          ? "border-success/20 bg-success-subtle"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            isCompleted
              ? "border-success bg-success text-white"
              : "border-border bg-card hover:border-foreground-muted"
          }`}
        >
          {isCompleted && <Check weight="bold" className="h-3 w-3" />}
        </button>

        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className={`font-medium ${
                isCompleted ? "text-success" : "text-foreground"
              }`}
            >
              {exercise.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-muted">{exercise.minutes} min</span>
              <CaretDown
                weight="bold"
                className={`h-4 w-4 text-foreground-faint transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border/50 px-4 py-4">
          <div className="prose prose-sm max-w-none text-foreground-muted">
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
            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                <Target weight="regular" className="h-3.5 w-3.5" />
                Success Criteria
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground-muted">
                {exercise.success_criteria.map((criterion, i) => (
                  <li key={i}>{criterion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {exercise.common_mistakes.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                <Warning weight="regular" className="h-3.5 w-3.5" />
                Common Mistakes
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground-muted">
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

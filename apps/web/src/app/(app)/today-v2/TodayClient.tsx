"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonV2Content } from "@/lib/schemas/v2.schema";
import { LessonViewV2 } from "@/components/LessonViewV2";
import {
  ArrowLeft,
  MusicNote,
  Lightning,
  Sparkle,
  CheckCircle,
  Play,
  CaretRight,
} from "@phosphor-icons/react";

interface ActivePath {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  status: "approved" | "in_progress";
  currentDay: number;
  totalDays: number | null;
  currentPhase: number;
  currentDayInfo: {
    dayNumber: number;
    title: string;
    focus: string;
    estimatedMinutes: number;
    phaseTitle: string;
    phaseObjective: string;
  } | null;
  todayLesson: {
    id: string;
    content: LessonV2Content;
    completedAt: string | null;
  } | null;
}

interface QuickPracticeLesson {
  id: string;
  prompt: string | null;
  content: LessonV2Content;
  createdAt: string;
}

interface TodayClientProps {
  date: string;
  activePaths: ActivePath[];
  quickPracticeLessons: QuickPracticeLesson[];
}

export function TodayClient({
  date,
  activePaths,
  quickPracticeLessons,
}: TodayClientProps) {
  const router = useRouter();
  const [selectedLesson, setSelectedLesson] = useState<{
    id: string;
    content: LessonV2Content;
    isQuickPractice: boolean;
    pathId?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quickPracticePrompt, setQuickPracticePrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function generatePathLesson(pathId: string) {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/paths/${pathId}/lesson`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate lesson");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateQuickPractice() {
    if (!quickPracticePrompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/quick-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: quickPracticePrompt.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate lesson");
      }
      setQuickPracticePrompt("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  async function completeLesson(lessonId: string, pathId?: string) {
    if (pathId) {
      const res = await fetch(`/api/paths/${pathId}/complete-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete lesson");
      }
    }
    setSelectedLesson(null);
    router.refresh();
  }

  async function saveQuickPractice(lessonId: string) {
    const res = await fetch(`/api/quick-practice/${lessonId}/save`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save lesson");
    }
    setSelectedLesson(null);
    router.refresh();
  }

  if (selectedLesson) {
    return (
      <div>
        <button
          onClick={() => setSelectedLesson(null)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft weight="bold" className="h-4 w-4" />
          Back to Today
        </button>
        <LessonViewV2
          lessonId={selectedLesson.id}
          lesson={selectedLesson.content}
          isQuickPractice={selectedLesson.isQuickPractice}
          onComplete={() => completeLesson(selectedLesson.id, selectedLesson.pathId)}
          onSave={
            selectedLesson.isQuickPractice
              ? () => saveQuickPractice(selectedLesson.id)
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Today</h1>
        <p className="text-sm text-foreground-muted">{formatDate(date)}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-error/20 bg-error-subtle px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Learning Path Lessons */}
      {activePaths.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <MusicNote weight="duotone" className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Learning Paths</h2>
          </div>

          <div className="grid gap-4">
            {activePaths.map((path) => (
              <PathLessonCard
                key={path.id}
                path={path}
                onGenerate={() => generatePathLesson(path.id)}
                onViewLesson={() =>
                  path.todayLesson &&
                  setSelectedLesson({
                    id: path.todayLesson.id,
                    content: path.todayLesson.content,
                    isQuickPractice: false,
                    pathId: path.id,
                  })
                }
                isGenerating={isGenerating}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick Practice */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lightning weight="duotone" className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Quick Practice</h2>
            <p className="text-sm text-foreground-muted">
              Generate a one-off lesson from any topic
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={quickPracticePrompt}
              onChange={(e) => setQuickPracticePrompt(e.target.value)}
              placeholder="e.g., Minor pentatonic licks, Bossa nova comping, CAGED C shape"
              disabled={isGenerating}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-background-subtle disabled:text-foreground-muted"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generateQuickPractice();
                }
              }}
            />
            <button
              onClick={generateQuickPractice}
              disabled={!quickPracticePrompt.trim() || isGenerating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:bg-foreground-faint disabled:text-background"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkle weight="bold" className="h-4 w-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Quick Practice Lessons */}
        {quickPracticeLessons.length > 0 && (
          <div className="grid gap-3">
            {quickPracticeLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-card-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {lesson.content.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                    <span>{lesson.prompt || "Quick practice"}</span>
                    <span className="text-foreground-faint">·</span>
                    <span>{lesson.content.estimated_minutes} min</span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setSelectedLesson({
                      id: lesson.id,
                      content: lesson.content,
                      isQuickPractice: true,
                    })
                  }
                  className="ml-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <Play weight="fill" className="h-3.5 w-3.5" />
                  Practice
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Empty State */}
      {activePaths.length === 0 && quickPracticeLessons.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle">
            <MusicNote weight="duotone" className="h-7 w-7 text-accent" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-foreground">Ready to practice?</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-muted">
            Create a learning path for structured lessons, or generate a quick
            practice session above.
          </p>
          <div className="mt-6">
            <a
              href="/learning-paths"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Create Learning Path
              <CaretRight weight="bold" className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function PathLessonCard({
  path,
  onGenerate,
  onViewLesson,
  isGenerating,
}: {
  path: ActivePath;
  onGenerate: () => void;
  onViewLesson: () => void;
  isGenerating: boolean;
}) {
  const progress = path.totalDays
    ? Math.round(((path.currentDay - 1) / path.totalDays) * 100)
    : 0;

  const hasLesson = !!path.todayLesson;
  const lessonCompleted = !!path.todayLesson?.completedAt;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{path.title}</span>
              {lessonCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
                  <CheckCircle weight="fill" className="h-3 w-3" />
                  Done today
                </span>
              )}
            </div>

            {path.currentDayInfo && (
              <div className="mt-3">
                <div className="text-sm font-medium text-foreground">
                  Day {path.currentDay}: {path.currentDayInfo.title}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                  <span>{path.currentDayInfo.focus}</span>
                  <span className="text-foreground-faint">·</span>
                  <span>{path.currentDayInfo.estimatedMinutes} min</span>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0">
            {hasLesson ? (
              <button
                onClick={onViewLesson}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Play weight="fill" className="h-3.5 w-3.5" />
                {lessonCompleted ? "Review" : "Practice"}
              </button>
            ) : (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:bg-foreground-faint disabled:text-background"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkle weight="bold" className="h-4 w-4" />
                    Generate Lesson
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="border-t border-border bg-background-subtle px-5 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground-muted">Progress</span>
          <span className="font-medium text-foreground">
            Day {path.currentDay} of {path.totalDays}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

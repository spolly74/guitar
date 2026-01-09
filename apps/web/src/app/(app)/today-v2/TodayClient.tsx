"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonV2Content } from "@/lib/schemas/v2.schema";
import { LessonViewV2 } from "@/components/LessonViewV2";

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
      // Complete learning path day
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

  // If a lesson is selected, show the lesson view
  if (selectedLesson) {
    return (
      <div>
        <button
          onClick={() => setSelectedLesson(null)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
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
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-zinc-600">{formatDate(date)}</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Learning Path Lessons */}
      {activePaths.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Learning Paths</h2>
            <p className="text-sm text-zinc-600">Your active learning journeys</p>
          </div>

          <div className="grid gap-4">
            {activePaths.map((path) => (
              <PathCard
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
        <div>
          <h2 className="text-lg font-semibold">Quick Practice</h2>
          <p className="text-sm text-zinc-600">
            Generate a one-off lesson from any topic
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={quickPracticePrompt}
              onChange={(e) => setQuickPracticePrompt(e.target.value)}
              placeholder="e.g., Minor pentatonic licks, Bossa nova comping, CAGED C shape"
              disabled={isGenerating}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-50"
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
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-400"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  Generating...
                </>
              ) : (
                "Generate"
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
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {lesson.content.title}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {lesson.prompt || "Quick practice"} · {lesson.content.estimated_minutes} min
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
                  className="ml-3 inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Practice
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Empty State */}
      {activePaths.length === 0 && quickPracticeLessons.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <div className="mx-auto h-12 w-12 text-zinc-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium">Ready to practice?</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Create a learning path for structured lessons, or generate a quick
            practice session above.
          </p>
          <div className="mt-4">
            <a
              href="/learning-paths"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Create Learning Path
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function PathCard({
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{path.title}</span>
            {lessonCompleted && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Today completed
              </span>
            )}
          </div>

          {path.currentDayInfo && (
            <div className="mt-2">
              <div className="text-sm font-medium text-zinc-700">
                Day {path.currentDay}: {path.currentDayInfo.title}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {path.currentDayInfo.focus} · {path.currentDayInfo.estimatedMinutes} min
              </div>
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Progress</span>
              <span>
                Day {path.currentDay} of {path.totalDays}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full bg-zinc-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {hasLesson ? (
            <button
              onClick={onViewLesson}
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              {lessonCompleted ? "Review" : "Practice"}
            </button>
          ) : (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-400"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  Generating...
                </>
              ) : (
                "Generate Lesson"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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

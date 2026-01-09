"use client";

import { useState } from "react";
import Link from "next/link";

interface HistoryLesson {
  id: string;
  title: string;
  type: "learning_path" | "quick_practice";
  pathTitle: string | null;
  dayNumber: number | null;
  completedAt: string | null;
  createdAt: string;
  estimatedMinutes: number;
}

interface HistoryClientProps {
  lessons: HistoryLesson[];
}

export function HistoryClient({ lessons }: HistoryClientProps) {
  const [filter, setFilter] = useState<"all" | "learning_path" | "quick_practice">("all");

  const filteredLessons = lessons.filter((l) => {
    if (filter === "all") return true;
    return l.type === filter;
  });

  // Group by date
  const groupedByDate = filteredLessons.reduce<Record<string, HistoryLesson[]>>(
    (acc, lesson) => {
      const date = formatDateKey(lesson.completedAt ?? lesson.createdAt);
      if (!acc[date]) acc[date] = [];
      acc[date].push(lesson);
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-zinc-600">
          Your completed and saved lessons
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-600">Filter:</span>
        <div className="flex gap-1">
          <FilterButton
            label="All"
            isActive={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterButton
            label="Learning Paths"
            isActive={filter === "learning_path"}
            onClick={() => setFilter("learning_path")}
          />
          <FilterButton
            label="Quick Practice"
            isActive={filter === "quick_practice"}
            onClick={() => setFilter("quick_practice")}
          />
        </div>
      </div>

      {/* Lessons grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <div className="mx-auto h-12 w-12 text-zinc-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium">No lessons yet</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Complete lessons from your learning paths or save quick practice
            sessions to see them here.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/today-v2"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Go to Today
            </Link>
            <Link
              href="/learning-paths"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              View Learning Paths
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="mb-3 text-sm font-medium text-zinc-500">
                {formatDateDisplay(date)}
              </div>
              <div className="space-y-2">
                {groupedByDate[date].map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-zinc-900 text-white"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

function LessonCard({ lesson }: { lesson: HistoryLesson }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{lesson.title}</span>
          {lesson.type === "learning_path" ? (
            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Learning Path
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Quick Practice
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
          {lesson.pathTitle && (
            <>
              <span>{lesson.pathTitle}</span>
              <span>·</span>
            </>
          )}
          {lesson.dayNumber && (
            <>
              <span>Day {lesson.dayNumber}</span>
              <span>·</span>
            </>
          )}
          <span>{lesson.estimatedMinutes} min</span>
          {lesson.completedAt && (
            <>
              <span>·</span>
              <span>Completed {formatTime(lesson.completedAt)}</span>
            </>
          )}
        </div>
      </div>
      <Link
        href={`/history/${lesson.id}`}
        className="ml-3 shrink-0 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        View
      </Link>
    </div>
  );
}

function formatDateKey(dateString: string): string {
  return new Date(dateString).toISOString().slice(0, 10);
}

function formatDateDisplay(dateKey: string): string {
  const date = new Date(dateKey + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) {
    return "Today";
  }
  if (date.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

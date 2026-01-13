"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClockCounterClockwise,
  Path,
  Lightning,
  ArrowRight,
} from "@phosphor-icons/react";

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
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          History
        </h1>
        <p className="text-sm text-foreground-muted">
          Your completed and saved lessons
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground-muted">Filter:</span>
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
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle">
            <ClockCounterClockwise weight="duotone" className="h-7 w-7 text-accent" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            No lessons yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-muted">
            Complete lessons from your learning paths or save quick practice
            sessions to see them here.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/today-v2"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Go to Today
              <ArrowRight weight="bold" className="h-4 w-4" />
            </Link>
            <Link
              href="/learning-paths"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-background-subtle"
            >
              View Learning Paths
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="mb-3 text-sm font-medium text-foreground-muted">
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
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-foreground text-background"
          : "bg-background-subtle text-foreground-muted hover:bg-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function LessonCard({ lesson }: { lesson: HistoryLesson }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-card-hover">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {lesson.title}
          </span>
          {lesson.type === "learning_path" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
              <Path weight="bold" className="h-3 w-3" />
              Path
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
              <Lightning weight="bold" className="h-3 w-3" />
              Quick
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-foreground-muted">
          {lesson.pathTitle && (
            <>
              <span>{lesson.pathTitle}</span>
              <span className="text-foreground-faint">·</span>
            </>
          )}
          {lesson.dayNumber && (
            <>
              <span>Day {lesson.dayNumber}</span>
              <span className="text-foreground-faint">·</span>
            </>
          )}
          <span>{lesson.estimatedMinutes} min</span>
          {lesson.completedAt && (
            <>
              <span className="text-foreground-faint">·</span>
              <span>Completed {formatTime(lesson.completedAt)}</span>
            </>
          )}
        </div>
      </div>
      <Link
        href={`/history/${lesson.id}`}
        className="ml-4 shrink-0 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LearningPlan } from "@/lib/schemas/v2.schema";

interface PathCardProps {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  plan: LearningPlan | null;
  status: "draft" | "approved" | "in_progress" | "paused" | "completed";
  currentPhase: number;
  currentDay: number;
  totalDays: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  variant: "draft" | "active" | "paused" | "completed";
}

export function PathCard({
  id,
  title,
  description,
  goal,
  plan,
  status,
  currentPhase,
  currentDay,
  totalDays,
  createdAt,
  completedAt,
  variant,
}: PathCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(variant === "draft");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = totalDays ? Math.round(((currentDay - 1) / totalDays) * 100) : 0;

  async function handleApprove() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/paths/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePause() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/paths/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to pause");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResume() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/paths/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resume");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this learning path? This cannot be undone.")) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/paths/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const borderColor = {
    draft: "border-amber-200",
    active: "border-zinc-200",
    paused: "border-zinc-200",
    completed: "border-green-200",
  }[variant];

  return (
    <div className={`rounded-lg border ${borderColor} bg-white`}>
      <div
        className="cursor-pointer px-6 py-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-lg font-semibold tracking-tight">
                {title}
              </span>
              <StatusBadge status={status} />
            </div>

            {description && (
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                {description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {totalDays && (
                <span>
                  Day {currentDay} of {totalDays}
                </span>
              )}
              {plan && (
                <span>
                  Phase {currentPhase} of {plan.phases.length}
                </span>
              )}
              <span>Created {formatDate(createdAt)}</span>
              {completedAt && <span>Completed {formatDate(completedAt)}</span>}
            </div>

            {status === "in_progress" && totalDays && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-zinc-900 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0">
            <svg
              className={`h-5 w-5 text-zinc-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-100 px-6 py-4">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {goal && (
            <div className="mb-4">
              <div className="text-sm font-medium text-zinc-700">Goal</div>
              <p className="mt-1 text-sm text-zinc-600">{goal}</p>
            </div>
          )}

          {plan && <PlanPreview plan={plan} currentDay={currentDay} />}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {status === "draft" && (
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-400"
              >
                {isLoading ? "Approving..." : "Approve & Start"}
              </button>
            )}

            {status === "in_progress" && (
              <button
                onClick={handlePause}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:bg-zinc-100"
              >
                {isLoading ? "Pausing..." : "Pause"}
              </button>
            )}

            {status === "paused" && (
              <button
                onClick={handleResume}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-400"
              >
                {isLoading ? "Resuming..." : "Resume"}
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    draft: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700",
    in_progress: "bg-green-100 text-green-700",
    paused: "bg-zinc-100 text-zinc-600",
    completed: "bg-green-100 text-green-700",
  }[status] || "bg-zinc-100 text-zinc-600";

  const labels = {
    draft: "Pending Approval",
    approved: "Ready",
    in_progress: "Active",
    paused: "Paused",
    completed: "Completed",
  }[status] || status;

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {labels}
    </span>
  );
}

function PlanPreview({ plan, currentDay }: { plan: LearningPlan; currentDay: number }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-zinc-700">Curriculum</div>
      <div className="space-y-2">
        {plan.phases.map((phase) => {
          const phaseDays = phase.days;
          const phaseStart = phaseDays[0]?.day_number ?? 0;
          const phaseEnd = phaseDays[phaseDays.length - 1]?.day_number ?? 0;
          const isCurrentPhase = currentDay >= phaseStart && currentDay <= phaseEnd;
          const isPastPhase = currentDay > phaseEnd;

          return (
            <div
              key={phase.number}
              className={`rounded-lg border p-3 ${
                isCurrentPhase
                  ? "border-zinc-300 bg-zinc-50"
                  : isPastPhase
                  ? "border-green-200 bg-green-50/50"
                  : "border-zinc-100 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">
                  Phase {phase.number}: {phase.title}
                </div>
                <div className="text-xs text-zinc-500">
                  Days {phaseStart}-{phaseEnd}
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-600">{phase.objective}</p>

              <div className="mt-2 space-y-1">
                {phaseDays.map((day) => {
                  const isCurrent = day.day_number === currentDay;
                  const isPast = day.day_number < currentDay;

                  return (
                    <div
                      key={day.day_number}
                      className={`flex items-center gap-2 text-xs ${
                        isCurrent
                          ? "font-medium text-zinc-900"
                          : isPast
                          ? "text-zinc-400"
                          : "text-zinc-600"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          isCurrent
                            ? "bg-zinc-900 text-white"
                            : isPast
                            ? "bg-green-200 text-green-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {isPast ? "✓" : day.day_number}
                      </span>
                      <span className="truncate">{day.title}</span>
                      <span className="ml-auto shrink-0 text-zinc-400">
                        {day.estimated_minutes}m
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

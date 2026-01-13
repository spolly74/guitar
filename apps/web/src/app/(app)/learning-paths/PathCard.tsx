"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LearningPlan } from "@/lib/schemas/v2.schema";
import {
  CaretDown,
  CheckCircle,
  Clock,
  Pause,
  Play,
  Trash,
  Check,
} from "@phosphor-icons/react";

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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="cursor-pointer px-5 py-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-lg font-semibold tracking-tight text-foreground">
                {title}
              </span>
              <StatusBadge status={status} />
            </div>

            {description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-foreground-muted">
                {description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
              {totalDays && (
                <span className="font-medium">
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
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Progress</span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                isExpanded ? "bg-background-subtle" : ""
              }`}
            >
              <CaretDown
                weight="bold"
                className={`h-4 w-4 text-foreground-muted transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-background-subtle px-5 py-4">
          {error && (
            <div className="mb-4 rounded-lg border border-error/20 bg-error-subtle px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {goal && (
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                Goal
              </div>
              <p className="mt-1 text-sm text-foreground">{goal}</p>
            </div>
          )}

          {plan && <PlanPreview plan={plan} currentDay={currentDay} />}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {status === "draft" && (
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:bg-foreground-faint disabled:text-background"
              >
                <Play weight="fill" className="h-3.5 w-3.5" />
                {isLoading ? "Approving..." : "Approve & Start"}
              </button>
            )}

            {status === "in_progress" && (
              <button
                onClick={handlePause}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-background-subtle disabled:text-foreground-muted"
              >
                <Pause weight="fill" className="h-3.5 w-3.5" />
                {isLoading ? "Pausing..." : "Pause"}
              </button>
            )}

            {status === "paused" && (
              <button
                onClick={handleResume}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:bg-foreground-faint disabled:text-background"
              >
                <Play weight="fill" className="h-3.5 w-3.5" />
                {isLoading ? "Resuming..." : "Resume"}
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-error/20 bg-card px-4 text-sm font-medium text-error transition-colors hover:bg-error-subtle disabled:text-foreground-muted"
            >
              <Trash weight="regular" className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    draft: {
      bg: "bg-warning-subtle",
      text: "text-warning",
      icon: Clock,
      label: "Pending",
    },
    approved: {
      bg: "bg-accent-subtle",
      text: "text-accent",
      icon: CheckCircle,
      label: "Ready",
    },
    in_progress: {
      bg: "bg-success-subtle",
      text: "text-success",
      icon: Play,
      label: "Active",
    },
    paused: {
      bg: "bg-background-subtle",
      text: "text-foreground-muted",
      icon: Pause,
      label: "Paused",
    },
    completed: {
      bg: "bg-success-subtle",
      text: "text-success",
      icon: CheckCircle,
      label: "Completed",
    },
  }[status] || {
    bg: "bg-background-subtle",
    text: "text-foreground-muted",
    icon: Clock,
    label: status,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <Icon weight="fill" className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function PlanPreview({ plan, currentDay }: { plan: LearningPlan; currentDay: number }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        Curriculum
      </div>
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
              className={`rounded-lg border p-4 ${
                isCurrentPhase
                  ? "border-accent/30 bg-accent-subtle"
                  : isPastPhase
                  ? "border-success/20 bg-success-subtle"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">
                  Phase {phase.number}: {phase.title}
                </div>
                <div className="text-xs text-foreground-muted">
                  Days {phaseStart}–{phaseEnd}
                </div>
              </div>
              <p className="mt-1 text-xs text-foreground-muted">{phase.objective}</p>

              <div className="mt-3 space-y-1">
                {phaseDays.map((day) => {
                  const isCurrent = day.day_number === currentDay;
                  const isPast = day.day_number < currentDay;

                  return (
                    <div
                      key={day.day_number}
                      className={`flex items-center gap-2 text-xs ${
                        isCurrent
                          ? "font-medium text-foreground"
                          : isPast
                          ? "text-foreground-faint"
                          : "text-foreground-muted"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                          isCurrent
                            ? "bg-accent text-accent-foreground"
                            : isPast
                            ? "bg-success-muted text-success"
                            : "bg-border text-foreground-muted"
                        }`}
                      >
                        {isPast ? (
                          <Check weight="bold" className="h-3 w-3" />
                        ) : (
                          day.day_number
                        )}
                      </span>
                      <span className="flex-1 truncate">{day.title}</span>
                      <span className="shrink-0 text-foreground-faint">
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

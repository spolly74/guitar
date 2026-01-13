"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, CaretDown, CaretUp } from "@phosphor-icons/react";

interface CreatePathFormProps {
  pathCount: number;
}

const MAX_PATHS = 20;

export function CreatePathForm({ pathCount }: CreatePathFormProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [goals, setGoals] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const canCreate = pathCount < MAX_PATHS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !canCreate) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          goals: goals.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create path");
      }

      setTopic("");
      setGoals("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="text-base font-semibold text-foreground">
        Create New Learning Path
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Enter a guitar topic and the AI will create a structured curriculum.
        {!canCreate && (
          <span className="text-warning">
            {" "}
            You&apos;ve reached the maximum of {MAX_PATHS} paths.
          </span>
        )}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-foreground"
          >
            Topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Jazz shell voicings, CAGED system, Minor pentatonic soloing"
            disabled={isLoading || !canCreate}
            className="mt-1.5 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-background-subtle disabled:text-foreground-muted"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1 text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            {showAdvanced ? (
              <CaretUp weight="bold" className="h-3.5 w-3.5" />
            ) : (
              <CaretDown weight="bold" className="h-3.5 w-3.5" />
            )}
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>
        </div>

        {showAdvanced && (
          <div>
            <label
              htmlFor="goals"
              className="block text-sm font-medium text-foreground"
            >
              Additional Goals (optional)
            </label>
            <textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Any specific goals or areas you want to focus on..."
              rows={2}
              disabled={isLoading || !canCreate}
              className="mt-1.5 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-background-subtle disabled:text-foreground-muted"
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-error/20 bg-error-subtle px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!topic.trim() || isLoading || !canCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-foreground-faint disabled:text-background"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Generating plan...
              </>
            ) : (
              <>
                <Sparkle weight="bold" className="h-4 w-4" />
                Create Learning Path
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
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

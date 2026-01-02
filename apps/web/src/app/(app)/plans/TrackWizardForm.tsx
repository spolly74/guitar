"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TrackWizardForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"program" | "song" | "technique" | "other">(
    "program",
  );
  const [goal, setGoal] = useState("");
  const [minutesPerDay, setMinutesPerDay] = useState(30);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="text-base font-semibold">Create a learning path</div>
      <p className="mt-1 text-sm text-zinc-600">
        Tell us the goal. We’ll generate a starter curriculum and exercises.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-6">
        <label className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-sm font-medium text-zinc-700">Title</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Punk Rock"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Kind</span>
          <select
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
          >
            <option value="program">Program</option>
            <option value="song">Song</option>
            <option value="technique">Technique</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 sm:col-span-1">
          <span className="text-sm font-medium text-zinc-700">Min/day</span>
          <input
            type="number"
            min={10}
            max={180}
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={minutesPerDay}
            onChange={(e) => setMinutesPerDay(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-6">
          <span className="text-sm font-medium text-zinc-700">Goal</span>
          <textarea
            className="min-h-24 rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none ring-zinc-900/10 focus:ring-4"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What should this learning path focus on? What does success look like?"
          />
        </label>

        <div className="sm:col-span-6 flex items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const res = await fetch("/api/tracks/wizard", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ title, kind, goal, minutesPerDay }),
                });
                const payload = (await res.json().catch(() => null)) as any;
                if (!res.ok || !payload?.ok) {
                  setMessage(payload?.error ?? "Failed");
                  return;
                }
                setMessage(
                  `Created learning path. ${payload.phase_count} phases, ${payload.exercise_count} exercises.`,
                );
                router.refresh();
              });
            }}
          >
            {isPending ? "Generating…" : "Create learning path"}
          </button>
          {message ? <div className="text-sm text-zinc-600">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

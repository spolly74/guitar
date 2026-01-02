"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Track = { id: string; title: string };

export function TrackGenerator(props: { tracks: Track[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("__adhoc__");
  const [message, setMessage] = useState<string | null>(null);

  const options = useMemo(() => {
    return [
      { id: "__adhoc__", title: "Ad-hoc (no learning path)" },
      ...props.tracks,
    ];
  }, [props.tracks]);

  async function generate() {
    setMessage(null);
    const plan_track_id =
      selected === "__adhoc__" ? null : selected;

    const res = await fetch("/api/plan/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan_track_id, mode: "replace" }),
    });

    const payload = (await res.json().catch(() => null)) as
      | null
      | { ok?: boolean; error?: string; plan_id?: string; plan_track_id?: string | null };

    if (!res.ok || payload?.ok === false) {
      setMessage(`Error: ${payload?.error ?? "Unknown error"}`);
      return;
    }

    setMessage(
      payload?.plan_id
        ? `Generated. plan_id=${payload.plan_id}`
        : "Generated.",
    );
    router.refresh();
  }

  async function nextLesson() {
    setMessage(null);
    const plan_track_id = selected === "__adhoc__" ? null : selected;
    if (!plan_track_id) {
      setMessage("Pick a learning path for next lesson.");
      return;
    }

    const res = await fetch("/api/plan/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan_track_id, mode: "next" }),
    });

    const payload = (await res.json().catch(() => null)) as
      | null
      | { ok?: boolean; error?: string; plan_id?: string };

    if (!res.ok || payload?.ok === false) {
      setMessage(`Error: ${payload?.error ?? "Unknown error"}`);
      return;
    }

    setMessage(payload?.plan_id ? `Next lesson created. plan_id=${payload.plan_id}` : "Next lesson created.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Generate a lesson
          </div>
          <div className="text-xs text-zinc-600">
            Pick a learning path (or ad-hoc), then generate today’s lesson.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-900/10 focus:ring-4"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={isPending}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-60"
            disabled={isPending}
            onClick={() => {
              startTransition(generate);
            }}
          >
            {isPending ? "Generating…" : "Generate"}
          </button>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
            disabled={isPending}
            onClick={() => {
              startTransition(nextLesson);
            }}
            title="Create another lesson for this learning path today"
          >
            Next lesson
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-2 text-xs text-zinc-600" role="status">
          {message}
        </div>
      ) : null}
    </div>
  );
}

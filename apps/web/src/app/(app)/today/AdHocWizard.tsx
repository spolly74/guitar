"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdHocWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">Ad-hoc lesson wizard</div>
      <div className="mt-1 text-xs text-zinc-600">
        Describe what you want to work on today. We’ll generate a focused prompt and create a lesson.
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-6">
        <label className="flex flex-col gap-1 sm:col-span-5">
          <span className="text-sm font-medium text-zinc-700">What do you want to work on?</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: find movable 7th chords, or comp through a blues, or learn a song section…"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-1">
          <span className="text-sm font-medium text-zinc-700">Minutes</span>
          <input
            type="number"
            min={10}
            max={180}
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
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
                const res = await fetch("/api/adhoc/wizard", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ prompt, minutes }),
                });
                const payload = (await res.json().catch(() => null)) as any;
                if (!res.ok || !payload?.ok) {
                  setMessage(payload?.error ?? "Failed");
                  return;
                }
                setMessage("Created ad-hoc lesson.");
                router.refresh();
              });
            }}
          >
            {isPending ? "Generating…" : "Create ad-hoc lesson"}
          </button>
          {message ? <div className="text-sm text-zinc-600">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

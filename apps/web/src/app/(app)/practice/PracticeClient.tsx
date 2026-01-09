"use client";

import { useMemo, useState, useTransition } from "react";
import type { LessonV1 } from "@/lib/schemas/lesson.schema";
import { LessonView } from "@/components/LessonView";
import { useRouter } from "next/navigation";

type ApiOk = { ok: true; lesson: LessonV1 };
type ApiErr = { ok: false; error: string };

export function PracticeClient() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [lesson, setLesson] = useState<LessonV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !isPending, [prompt, isPending]);

  async function generate() {
    setError(null);
    setNotice(null);
    const res = await fetch("/api/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const payload = (await res.json().catch(() => null)) as null | ApiOk | ApiErr;
    if (!res.ok || !payload || (payload as any).ok === false) {
      setError((payload as any)?.error ?? "Failed to generate lesson");
      return;
    }

    setLesson((payload as any).lesson);
  }

  async function saveToToday() {
    if (!lesson) return;
    setError(null);
    setNotice(null);

    const res = await fetch("/api/plan/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: lesson }),
    });

    const payload = (await res.json().catch(() => null)) as
      | null
      | { ok: true; plan_id: string }
      | { ok: false; error: string };

    if (!res.ok || !payload || (payload as any).ok === false) {
      setError((payload as any)?.error ?? "Failed to save to Today");
      return;
    }

    setNotice("Saved to Today.");
    router.push("/today");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-base font-semibold">Generate a lesson</div>
        <p className="mt-1 text-sm text-zinc-600">
          Describe what you want to practice. We’ll generate a structured 30-minute lesson (warmup, review, new, apply).
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <textarea
            className="min-h-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-900/10 focus:ring-4"
            placeholder='e.g. "Teach me shell voicings for ii–V–I in C. Include 2–3 chord diagrams and a comping application."'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-60"
              disabled={!canGenerate}
              onClick={() => startTransition(generate)}
            >
              {isPending ? "Generating…" : "Generate"}
            </button>

            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              disabled={!lesson || isPending || isSaving}
              onClick={() => startSaving(saveToToday)}
              title="Save this lesson as an ad-hoc lesson for today"
            >
              {isSaving ? "Saving…" : "Save to Today"}
            </button>

            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
              onClick={() => {
                setPrompt("");
                setError(null);
                setLesson(null);
                setNotice(null);
              }}
              disabled={isPending || isSaving}
            >
              Reset
            </button>
          </div>

          {notice ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {lesson ? (
        <LessonView lesson={lesson} />
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Enter a prompt above and click Generate.
        </div>
      )}
    </div>
  );
}

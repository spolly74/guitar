"use client";

import { useState, useTransition } from "react";
import { savePracticeReflection } from "./actions";

type PlanOption = { id: string; label: string };

export function ReflectionForm(props: {
  planOptions: PlanOption[];
  initial: {
    planId: string | null;
    hardNotes: string;
    easyNotes: string;
    notes: string;
    confidence: { warmup: number; review: number; new: number; apply: number };
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [planId, setPlanId] = useState<string>(props.initial.planId ?? "");
  const [hardNotes, setHardNotes] = useState(props.initial.hardNotes);
  const [easyNotes, setEasyNotes] = useState(props.initial.easyNotes);
  const [notes, setNotes] = useState(props.initial.notes);
  const [conf, setConf] = useState(props.initial.confidence);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    setMessage(null);
    const fd = new FormData();
    fd.set("plan_id", planId);
    fd.set("hard_notes", hardNotes);
    fd.set("easy_notes", easyNotes);
    fd.set("notes", notes);
    fd.set("confidence_warmup", String(conf.warmup));
    fd.set("confidence_review", String(conf.review));
    fd.set("confidence_new", String(conf.new));
    fd.set("confidence_apply", String(conf.apply));

    startTransition(async () => {
      await savePracticeReflection(fd);
      setMessage("Saved.");
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Reflection</div>
          <div className="mt-1 text-sm text-zinc-600">
            Capture what was hard/easy so tomorrow’s lesson adjusts.
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save reflection"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-6">
        <label className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-sm font-medium text-zinc-700">Lesson (optional)</span>
          <select
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">Overall (all lessons)</option>
            {props.planOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-3 grid grid-cols-4 gap-2">
          {(
            [
              ["warmup", "Warmup"],
              ["review", "Review"],
              ["new", "New"],
              ["apply", "Apply"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-700">{label}</span>
              <input
                type="number"
                min={0}
                max={5}
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
                value={conf[k]}
                onChange={(e) =>
                  setConf((prev) => ({ ...prev, [k]: Number(e.target.value) }))
                }
                title="Confidence 0–5"
              />
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-sm font-medium text-zinc-700">What felt hard?</span>
          <textarea
            className="min-h-24 rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none ring-zinc-900/10 focus:ring-4"
            value={hardNotes}
            onChange={(e) => setHardNotes(e.target.value)}
            placeholder="e.g. switching Dm7→G7 cleanly, keeping steady time…"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-sm font-medium text-zinc-700">What felt easy?</span>
          <textarea
            className="min-h-24 rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none ring-zinc-900/10 focus:ring-4"
            value={easyNotes}
            onChange={(e) => setEasyNotes(e.target.value)}
            placeholder="e.g. shell shapes were comfortable, warmup felt good…"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-6">
          <span className="text-sm font-medium text-zinc-700">Notes (optional)</span>
          <textarea
            className="min-h-20 rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none ring-zinc-900/10 focus:ring-4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else you want tomorrow’s plan to incorporate?"
          />
        </label>
      </div>

      {message ? (
        <div className="mt-3 text-sm text-zinc-600" role="status">
          {message}
        </div>
      ) : null}
    </div>
  );
}

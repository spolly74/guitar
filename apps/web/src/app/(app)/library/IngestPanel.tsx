"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ingestText } from "./actions";

type IngestMode = "text" | "url" | "pdf" | "youtube";

function SegmentedControl(props: {
  value: IngestMode;
  onChange: (v: IngestMode) => void;
}) {
  const items: Array<{ id: IngestMode; label: string }> = [
    { id: "text", label: "Text" },
    { id: "url", label: "Web URL" },
    { id: "pdf", label: "PDF" },
    { id: "youtube", label: "YouTube" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = it.id === props.value;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => props.onChange(it.id)}
            className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function IngestPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<IngestMode>("url");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // shared
  const [title, setTitle] = useState("");

  // text
  const [rawText, setRawText] = useState("");

  // url
  const [url, setUrl] = useState("");
  const [includeImages, setIncludeImages] = useState(true);

  // pdf
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // youtube
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeFallback, setYoutubeFallback] = useState(true);

  const titleLabel = useMemo(() => {
    if (mode === "text") return "Title";
    return "Title override (optional)";
  }, [mode]);

  async function submit() {
    setMessage(null);

    if (mode === "text") {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("raw_text", rawText);
      await ingestText(fd);
      setMessage("Ingested.");
      router.refresh();
      return;
    }

    if (mode === "url") {
      const res = await fetch("/api/library/ingest-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, title, include_images: includeImages }),
      });
      const payload = (await res.json().catch(() => null)) as any;
      if (!res.ok || !payload?.ok) {
        setMessage(payload?.error ?? "Failed");
        return;
      }
      const imgPart =
        typeof payload.imageCount === "number" ? `, ${payload.imageCount} images` : "";
      setMessage(`Ingested (${payload.chunkCount} chunks${imgPart}).`);
      router.refresh();
      return;
    }

    if (mode === "pdf") {
      if (!pdfFile) {
        setMessage("Please choose a PDF.");
        return;
      }
      if (!title.trim()) {
        setMessage("Title is required for PDFs.");
        return;
      }
      const fd = new FormData();
      fd.set("title", title);
      fd.set("file", pdfFile);
      const res = await fetch("/api/library/ingest-pdf", { method: "POST", body: fd });
      const payload = (await res.json().catch(() => null)) as any;
      if (!res.ok || !payload?.ok) {
        setMessage(payload?.error ?? "Failed");
        return;
      }
      setMessage(`Ingested (${payload.chunkCount} chunks).`);
      router.refresh();
      return;
    }

    if (mode === "youtube") {
      const res = await fetch("/api/library/ingest-youtube", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl,
          title,
          lang: "en",
          allow_metadata_fallback: youtubeFallback,
        }),
      });
      const payload = (await res.json().catch(() => null)) as any;
      if (!res.ok || !payload?.ok) {
        setMessage(payload?.error ?? payload?.suggestion ?? "Failed");
        return;
      }
      const warn = payload?.warning ? ` (${payload.warning})` : "";
      setMessage(`Ingested (${payload.chunkCount} chunks).${warn}`);
      router.refresh();
      return;
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-base font-semibold">Ingest</div>
          <div className="text-sm text-zinc-600">
            Add material to your personal knowledge base (text, web page, PDF, or YouTube).
          </div>
        </div>

        <SegmentedControl value={mode} onChange={(v) => setMode(v)} />

        <div className="grid gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">{titleLabel}</span>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                mode === "pdf"
                  ? "PDF: Jazz shells cheat sheet"
                  : mode === "youtube"
                    ? "My notes: ii–V–I lesson"
                    : mode === "text"
                      ? "Shell voicings: basics"
                      : "My notes: shell voicings"
              }
            />
          </label>

          {mode === "text" ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-700">Text</span>
              <textarea
                className="min-h-40 rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none ring-zinc-900/10 focus:ring-4"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your notes here…"
              />
            </label>
          ) : null}

          {mode === "url" ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">URL</span>
                <input
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                />
                Include images (store + OpenAI Vision OCR, 5MB cap)
              </label>
            </>
          ) : null}

          {mode === "pdf" ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-700">PDF file</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}

          {mode === "youtube" ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">YouTube URL</span>
                <input
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={youtubeFallback}
                  onChange={(e) => setYoutubeFallback(e.target.checked)}
                />
                If no transcript, ingest title/description anyway (metadata-only)
              </label>
            </>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => startTransition(submit)}
            >
              {isPending ? "Ingesting…" : "Ingest"}
            </button>
            {message ? <div className="text-sm text-zinc-600">{message}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

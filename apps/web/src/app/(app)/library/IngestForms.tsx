"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function IngestUrlForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="text-base font-semibold">Ingest a web page</div>
      <p className="mt-1 text-sm text-zinc-600">
        Paste a URL and we’ll fetch it, extract readable text, then chunk + embed.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">URL</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">
            Title override (optional)
          </span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My notes: shell voicings"
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
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
                  typeof payload.imageCount === "number"
                    ? `, ${payload.imageCount} images`
                    : "";
                setMessage(`Ingested (${payload.chunkCount} chunks${imgPart}).`);
                router.refresh();
              });
            }}
          >
            {isPending ? "Ingesting…" : "Ingest URL"}
          </button>
          {message ? <div className="text-sm text-zinc-600">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function IngestPdfForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="text-base font-semibold">Ingest a PDF</div>
      <p className="mt-1 text-sm text-zinc-600">
        Upload a PDF and we’ll extract text, then chunk + embed. (Max 10MB.)
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">Title</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="PDF: Jazz shells cheat sheet"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">PDF file</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending || !file || !title.trim()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const fd = new FormData();
                fd.set("title", title);
                if (file) fd.set("file", file);
                const res = await fetch("/api/library/ingest-pdf", {
                  method: "POST",
                  body: fd,
                });
                const payload = (await res.json().catch(() => null)) as any;
                if (!res.ok || !payload?.ok) {
                  setMessage(payload?.error ?? "Failed");
                  return;
                }
                setMessage(`Ingested (${payload.chunkCount} chunks).`);
                router.refresh();
              });
            }}
          >
            {isPending ? "Ingesting…" : "Ingest PDF"}
          </button>
          {message ? <div className="text-sm text-zinc-600">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function IngestYoutubeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [fallback, setFallback] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="text-base font-semibold">Ingest a YouTube transcript</div>
      <p className="mt-1 text-sm text-zinc-600">
        Paste a YouTube URL. We’ll try to fetch the transcript, then chunk + embed it.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">YouTube URL</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">
            Title override (optional)
          </span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My notes: ii–V–I lesson"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={fallback}
            onChange={(e) => setFallback(e.target.checked)}
          />
          If no transcript, ingest title/description anyway (metadata-only)
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const res = await fetch("/api/library/ingest-youtube", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    url,
                    title,
                    lang: "en",
                    allow_metadata_fallback: fallback,
                  }),
                });
                const payload = (await res.json().catch(() => null)) as any;
                if (!res.ok || !payload?.ok) {
                  setMessage(
                    payload?.error ??
                      payload?.suggestion ??
                      "Failed to ingest YouTube transcript",
                  );
                  return;
                }
                const warn = payload?.warning ? ` (${payload.warning})` : "";
                setMessage(`Ingested (${payload.chunkCount} chunks).${warn}`);
                router.refresh();
              });
            }}
          >
            {isPending ? "Ingesting…" : "Ingest YouTube"}
          </button>
          {message ? <div className="text-sm text-zinc-600">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

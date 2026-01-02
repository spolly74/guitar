import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

export function normalizeYoutubeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) throw new Error("Missing YouTube URL");
  // Accept raw video id too (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return `https://www.youtube.com/watch?v=${s}`;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    throw new Error("Invalid YouTube URL");
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") {
    throw new Error("Not a YouTube URL");
  }
  if (host === "youtu.be") {
    const id = url.pathname.replace("/", "").trim();
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error("Invalid YouTube video id");
    return `https://www.youtube.com/watch?v=${id}`;
  }
  const id = url.searchParams.get("v")?.trim();
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error("Missing YouTube video id");
  return `https://www.youtube.com/watch?v=${id}`;
}

export async function fetchYoutubeTitle(input: { youtubeUrl: string }): Promise<string | null> {
  try {
    const u = new URL("https://www.youtube.com/oembed");
    u.searchParams.set("url", input.youtubeUrl);
    u.searchParams.set("format", "json");
    const res = await fetch(u.toString(), { method: "GET" });
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    return json.title?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function fetchYoutubeDescription(input: {
  youtubeUrl: string;
}): Promise<string | null> {
  try {
    const res = await fetch(input.youtubeUrl, {
      method: "GET",
      headers: {
        "user-agent": "guitar-practice-app/0.1 (knowledge-ingest)",
        accept: "text/html",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const og = html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i,
    );
    const nameDesc = html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
    );

    const raw = (og?.[1] ?? nameDesc?.[1] ?? "").trim();
    if (!raw) return null;

    // Decode minimal HTML entities
    const text = raw
      .replaceAll("&amp;", "&")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">");

    return text.trim() || null;
  } catch {
    return null;
  }
}

function formatTimestamp(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export async function fetchYoutubeTranscriptText(input: {
  youtubeUrl: string;
  lang?: string;
}): Promise<{ text: string }> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(input.youtubeUrl, {
      lang: input.lang ?? "en",
    });

    const lines = items
      .map((i) => {
        const ts = formatTimestamp(Number(i.offset ?? 0));
        const t = String(i.text ?? "").replace(/\s+/g, " ").trim();
        if (!t) return null;
        return `[${ts}] ${t}`;
      })
      .filter(Boolean);

    const text = lines.join("\n").trim();
    if (!text) throw new Error("Transcript was empty");
    return { text };
  } catch (e) {
    if (e instanceof YoutubeTranscriptTooManyRequestError) {
      throw new Error("YouTube transcript rate-limited. Try again later.");
    }
    if (e instanceof YoutubeTranscriptVideoUnavailableError) {
      throw new Error("YouTube video unavailable.");
    }
    if (e instanceof YoutubeTranscriptDisabledError) {
      throw new Error("Transcripts are disabled for this video.");
    }
    if (e instanceof YoutubeTranscriptNotAvailableLanguageError) {
      throw new Error("Transcript not available in English for this video.");
    }
    if (e instanceof YoutubeTranscriptNotAvailableError) {
      throw new Error("No transcript available for this video.");
    }
    throw new Error(e instanceof Error ? e.message : "Transcript extraction failed.");
  }
}

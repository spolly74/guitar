import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export type ImageCandidate = {
  url: string;
  alt: string;
  caption: string;
};

function isPrivateIp(hostname: string) {
  // Very small SSRF guard: block localhost + common private ranges (IPv4).
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;
  const m = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function validateFetchUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }
  if (isPrivateIp(url.hostname)) {
    throw new Error("Blocked URL host");
  }
  return url;
}

export async function fetchAndExtractReadableText(input: {
  url: string;
  timeoutMs?: number;
}): Promise<{ title: string; text: string; images: ImageCandidate[] }> {
  const url = validateFetchUrl(input.url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 12_000);
  const res = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent": "guitar-practice-app/0.1 (knowledge-ingest)",
      accept: "text/html,application/xhtml+xml",
    },
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Unsupported content-type: ${contentType}`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url: url.toString() });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const title =
    (article?.title?.trim() || dom.window.document.title?.trim() || url.hostname).slice(
      0,
      200,
    );
  const text = (article?.textContent ?? dom.window.document.body?.textContent ?? "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) throw new Error("No readable text found on page");

  const images = extractImageCandidates({
    pageUrl: url.toString(),
    dom,
    articleHtml: article?.content ?? null,
  });

  return { title, text, images };
}

function pickSrc(img: HTMLImageElement): string | null {
  const src = img.getAttribute("src")?.trim();
  if (src) return src;
  const srcset = img.getAttribute("srcset")?.trim();
  if (!srcset) return null;
  // Pick the first candidate; we only need a stable URL.
  return srcset.split(",")[0]?.trim().split(" ")[0] ?? null;
}

function extractImageCandidates(input: {
  pageUrl: string;
  dom: JSDOM;
  articleHtml: string | null;
}): ImageCandidate[] {
  const base = new URL(input.pageUrl);

  // Prefer images within the readable article content if available.
  const doc =
    input.articleHtml && input.articleHtml.trim().length > 0
      ? new JSDOM(input.articleHtml, { url: input.pageUrl }).window.document
      : input.dom.window.document;

  const imgs = Array.from(doc.querySelectorAll("img"));
  const out: ImageCandidate[] = [];

  for (const img of imgs) {
    const raw = pickSrc(img);
    if (!raw) continue;
    let abs: string;
    try {
      abs = new URL(raw, base).toString();
    } catch {
      continue;
    }
    const alt = (img.getAttribute("alt") ?? "").trim();
    const fig = img.closest("figure");
    const caption = (fig?.querySelector("figcaption")?.textContent ?? "").trim();
    out.push({ url: abs, alt, caption });
  }

  // Deterministic de-dupe by url
  const seen = new Set<string>();
  const deduped: ImageCandidate[] = [];
  for (const c of out) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    deduped.push(c);
  }

  return deduped;
}

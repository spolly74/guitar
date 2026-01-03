import { fetchAndExtractReadableText, validateFetchUrl } from "@/lib/knowledge/fetchExtract";
import type { WebSearchResult } from "@/lib/ai/webSearch";

export type WebSource = {
  title: string;
  url: string;
  snippet: string;
  extractedText: string;
};

function trimTo(s: string, maxChars: number) {
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export async function collectWebSources(input: {
  results: WebSearchResult[];
  maxSources?: number;
  maxCharsPerSource?: number;
  maxTotalChars?: number;
}): Promise<{ sources: WebSource[]; contextText: string }> {
  const maxSources = Math.max(0, Math.min(5, Number(input.maxSources ?? 3)));
  const maxCharsPerSource = Math.max(300, Math.min(4_000, Number(input.maxCharsPerSource ?? 1_800)));
  const maxTotalChars = Math.max(800, Math.min(10_000, Number(input.maxTotalChars ?? 4_000)));

  const dedup = new Set<string>();
  const urls = input.results
    .map((r) => r.url)
    .filter(Boolean)
    .filter((u) => {
      const key = u.toLowerCase();
      if (dedup.has(key)) return false;
      dedup.add(key);
      return true;
    })
    .slice(0, maxSources);

  const sources: WebSource[] = [];
  let used = 0;

  for (const url of urls) {
    try {
      const safe = validateFetchUrl(url).toString();
      const extracted = await fetchAndExtractReadableText({ url: safe });
      const text = trimTo(extracted.text ?? "", maxCharsPerSource);
      if (!text) continue;
      if (used + text.length > maxTotalChars) break;
      used += text.length;

      const meta = input.results.find((r) => r.url === url);
      sources.push({
        title: (meta?.title ?? extracted.title ?? safe).trim(),
        url: safe,
        snippet: (meta?.snippet ?? "").trim(),
        extractedText: text,
      });
    } catch {
      continue;
    }
  }

  const contextText =
    sources.length === 0
      ? ""
      : [
          "Web research (sources + extracted text; cite and follow these when relevant):",
          ...sources.map((s, i) =>
            [
              `[${i + 1}] ${s.title}`,
              `URL: ${s.url}`,
              s.snippet ? `Snippet: ${s.snippet}` : "",
              "Extract:",
              s.extractedText,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        ].join("\n\n");

  return { sources, contextText };
}

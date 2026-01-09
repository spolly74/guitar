export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

import { requiredEnv } from "@/lib/server/requiredEnv";

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

export async function webSearch(input: {
  query: string;
  count?: number;
}): Promise<WebSearchResult[]> {
  const provider = (process.env.WEB_SEARCH_PROVIDER ?? "brave").toLowerCase();
  if (provider !== "brave") {
    throw new Error(`Unsupported WEB_SEARCH_PROVIDER='${provider}'. Use 'brave'.`);
  }

  const apiKey = requiredEnv("BRAVE_SEARCH_API_KEY");
  const q = input.query.trim();
  if (!q) return [];

  const count = Math.max(1, Math.min(10, Number(input.count ?? 6)));
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", q);
  url.searchParams.set("count", String(count));
  url.searchParams.set("safesearch", "moderate");

  const t = withTimeout(8_000);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
    signal: t.signal,
  }).finally(t.done);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brave Search failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const results = (json?.web?.results ?? []) as any[];

  return results
    .map((r) => ({
      title: String(r.title ?? "").trim(),
      url: String(r.url ?? "").trim(),
      snippet: String(r.description ?? r.snippet ?? "").trim(),
    }))
    .filter((r) => r.title && r.url);
}

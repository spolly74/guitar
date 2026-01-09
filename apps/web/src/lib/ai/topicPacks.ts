import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type TopicPack = { id: string; title: string; content: string };

function includesWord(haystack: string, word: string) {
  return haystack.toLowerCase().includes(word.toLowerCase());
}

export async function loadTopicPacksForPrompt(prompt: string): Promise<TopicPack[]> {
  const packs: TopicPack[] = [];
  const p = prompt.trim();
  if (!p) return packs;

  // CAGED is explicitly requested sometimes; provide a baseline reference pack.
  if (includesWord(p, "caged")) {
    const content = await readFile(
      join(process.cwd(), "src", "ai", "packs", "caged.md"),
      "utf8",
    );
    packs.push({ id: "caged", title: "CAGED system", content });
  }

  return packs;
}

export function packsToContextText(packs: TopicPack[]): string {
  if (packs.length === 0) return "";
  return [
    "Built-in reference packs (treat as authoritative baseline):",
    ...packs.map((p) => `## ${p.title}\n${p.content}`.trim()),
  ].join("\n\n");
}



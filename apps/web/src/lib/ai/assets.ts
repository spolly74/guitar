import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadAiTextAsset(relativePathFromSrc: string): Promise<string> {
  const p = join(process.cwd(), "src", relativePathFromSrc);
  return await readFile(p, "utf8");
}

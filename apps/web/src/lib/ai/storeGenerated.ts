import { sha256Hex } from "@/lib/diagrams/stableHash";
import { ingestTextDocument } from "@/lib/knowledge/ingest";

type SupabaseLike = {
  from: (table: string) => any;
};

function lessonToText(input: { lesson: any }) {
  const l = input.lesson;
  const lines: string[] = [];
  lines.push(`Title: ${String(l.title ?? "").trim()}`);
  lines.push(`Date: ${String(l.date ?? "").trim()}`);
  lines.push("");
  lines.push(String(l.focus_prompt ?? "").trim());
  lines.push("");
  for (const b of l.today_blocks ?? []) {
    lines.push(`${String(b.block).toUpperCase()} (${Number(b.minutes ?? 0)} min)`);
    for (const it of b.items ?? []) {
      lines.push(`- ${String(it.name ?? "")} (${Number(it.minutes ?? 0)} min)`);
      const instr = String(it.instructions_md ?? "").trim();
      if (instr) lines.push(`  ${instr.replace(/\s+/g, " ")}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function theoryToText(input: { theory: any }) {
  const t = input.theory;
  return [
    `Chords: ${(t.chords ?? []).join(", ")}`.trim(),
    "",
    "Voicings:",
    ...Object.entries(t.voicings ?? {}).flatMap(([ch, vs]) => [
      `- ${ch}: ${(vs as any[]).join(" | ")}`,
    ]),
    "",
    "Progressions:",
    ...(t.progressions ?? []).map((p: any) => `- ${p.name}: ${(p.chords ?? []).join(" ")}`),
    "",
    "Notes:",
    ...(t.notes ?? []),
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function documentExistsBySourceUrl(input: {
  supabase: SupabaseLike;
  userId: string;
  sourceUrl: string;
}): Promise<boolean> {
  const res = await input.supabase
    .from("knowledge_documents")
    .select("id")
    .eq("user_id", input.userId)
    .eq("source_url", input.sourceUrl)
    .limit(1)
    .maybeSingle();
  if (res.error && res.error.code !== "PGRST116") throw new Error(res.error.message);
  return Boolean(res.data?.id);
}

export async function storeGeneratedArtifactsBestEffort(input: {
  supabase: SupabaseLike;
  userId: string;
  lesson: any;
  theory?: any;
}) {
  try {
    const lessonText = lessonToText({ lesson: input.lesson });
    const lessonHash = sha256Hex(lessonText).slice(0, 24);
    const lessonSourceUrl = `lesson://${lessonHash}`;
    if (
      lessonText &&
      !(await documentExistsBySourceUrl({
        supabase: input.supabase,
        userId: input.userId,
        sourceUrl: lessonSourceUrl,
      }))
    ) {
      await ingestTextDocument({
        supabase: input.supabase as any,
        userId: input.userId,
        title: `Generated lesson (${String(input.lesson?.date ?? "").slice(0, 10)})`,
        rawText: lessonText,
        sourceType: "lesson",
        sourceUrl: lessonSourceUrl,
      });
    }
  } catch {
    // best-effort: do not block lesson generation
  }

  try {
    if (!input.theory) return;
    const theoryText = theoryToText({ theory: input.theory });
    const theoryHash = sha256Hex(theoryText).slice(0, 24);
    const theorySourceUrl = `theory://${theoryHash}`;
    if (
      theoryText &&
      !(await documentExistsBySourceUrl({
        supabase: input.supabase,
        userId: input.userId,
        sourceUrl: theorySourceUrl,
      }))
    ) {
      await ingestTextDocument({
        supabase: input.supabase as any,
        userId: input.userId,
        title: "Generated theory notes",
        rawText: theoryText,
        sourceType: "theory",
        sourceUrl: theorySourceUrl,
      });
    }
  } catch {
    // best-effort: do not block lesson generation
  }
}

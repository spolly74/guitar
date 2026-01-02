import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ingestYoutubeTranscript } from "@/lib/knowledge/ingest";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | null
    | { url?: string; title?: string; lang?: string; allow_metadata_fallback?: boolean };

  const url = (body?.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  try {
    const res = await ingestYoutubeTranscript({
      supabase,
      userId,
      youtubeUrl: url,
      titleOverride: body?.title,
      lang: body?.lang ?? "en",
      allowMetadataFallback: body?.allow_metadata_fallback ?? true,
    });

    return NextResponse.json({
      ok: true,
      ...res,
      warning:
        (res as any)?.mode === "metadata"
          ? "No transcript available; ingested metadata only."
          : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // 422: user-actionable "no transcript" class of errors
    const status =
      message.toLowerCase().includes("transcript") ||
      message.toLowerCase().includes("youtube")
        ? 422
        : 500;
    return NextResponse.json(
      {
        ok: false,
        error: message,
        suggestion:
          "If this video has no transcript, paste the transcript text into 'Add a text document' as a fallback.",
      },
      { status },
    );
  }
}

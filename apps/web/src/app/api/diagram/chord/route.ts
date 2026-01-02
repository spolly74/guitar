import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isChordSpec, type ChordDiagramSpec } from "@/lib/diagrams/chordSpec";
import { renderChordSvg } from "@/lib/diagrams/renderChordSvg";
import { sha256Hex, stableJsonStringify } from "@/lib/diagrams/stableHash";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isChordSpec(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid chord spec (expected type=chord, style=jazz-clean-v1)" },
      { status: 400 },
    );
  }

  const spec = body as ChordDiagramSpec;
  const canonical = stableJsonStringify(spec);
  const specHash = sha256Hex(canonical);

  const existing = await supabase
    .from("diagram_svgs")
    .select("svg")
    .eq("user_id", userId)
    .eq("spec_hash", specHash)
    .limit(1)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    return NextResponse.json({ ok: false, error: existing.error.message }, { status: 500 });
  }

  if (existing.data?.svg) {
    return NextResponse.json({ ok: true, hash: specHash, svg: existing.data.svg, cached: true });
  }

  const svg = renderChordSvg(spec);

  const upserted = await supabase
    .from("diagram_svgs")
    .upsert(
      {
        user_id: userId,
        spec_hash: specHash,
        diagram_type: "chord",
        style: spec.style,
        spec_json: spec,
        svg,
      },
      { onConflict: "user_id,spec_hash" },
    );

  if (upserted.error) {
    return NextResponse.json({ ok: false, error: upserted.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, hash: specHash, svg, cached: false });
}

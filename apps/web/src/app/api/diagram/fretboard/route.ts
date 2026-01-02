import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isFretboardSpec, type FretboardDiagramSpec } from "@/lib/diagrams/fretboardSpec";
import { renderFretboardSvg } from "@/lib/diagrams/renderFretboardSvg";
import { sha256Hex, stableJsonStringify } from "@/lib/diagrams/stableHash";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isFretboardSpec(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid fretboard spec (expected type=fretboard, style=jazz-clean-v1)" },
      { status: 400 },
    );
  }

  const spec = body as FretboardDiagramSpec;
  const canonical = stableJsonStringify(spec);
  const specHash = sha256Hex(canonical);

  // Cache lookup (per-user)
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

  const svg = renderFretboardSvg(spec);

  // Insert is intentionally idempotent. Multiple clients may request the same spec concurrently,
  // so we use upsert to avoid unique constraint races.
  const upserted = await supabase
    .from("diagram_svgs")
    .upsert(
      {
        user_id: userId,
        spec_hash: specHash,
        diagram_type: "fretboard",
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

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureBeginnerJazzTrack } from "@/lib/tracks/defaults";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    const { data } = await supabase.auth.getUser();
    if (data.user) {
      // Create default track on first sign-in (idempotent).
      await ensureBeginnerJazzTrack({ supabase, userId: data.user.id });
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

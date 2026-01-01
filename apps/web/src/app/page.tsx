import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Server-side redirect depending on auth state.
  // Middleware also protects these routes; this is a simple UX-friendly default.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/today");
  redirect("/login");
}

type SupabaseLike = {
  from: (table: string) => any;
};

export async function ensureBeginnerJazzTrack(input: {
  supabase: SupabaseLike;
  userId: string;
}): Promise<void> {
  const existing = await input.supabase
    .from("plan_tracks")
    .select("id")
    .eq("user_id", input.userId)
    .eq("title", "Beginner Jazz Guitar")
    .limit(1)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) return;

  const inserted = await input.supabase.from("plan_tracks").insert({
    user_id: input.userId,
    title: "Beginner Jazz Guitar",
    kind: "program",
    description: "Shell voicings → ii–V–I → voice leading → comping.",
  });

  if (inserted.error) throw new Error(inserted.error.message);
}

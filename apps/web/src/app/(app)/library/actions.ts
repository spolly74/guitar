"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ingestTextDocument } from "@/lib/knowledge/ingest";
import { retrieveKnowledge } from "@/lib/knowledge/retrieve";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return { supabase, user: data.user };
}

export async function ingestText(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const rawText = String(formData.get("raw_text") ?? "").trim();
  if (!title) throw new Error("Title is required");
  if (!rawText) throw new Error("Text is required");

  const { supabase, user } = await requireUser();
  await ingestTextDocument({
    supabase,
    userId: user.id,
    title,
    rawText,
    sourceType: "text",
  });

  revalidatePath("/library");
}

export async function searchKnowledge(formData: FormData) {
  const query = String(formData.get("query") ?? "").trim();
  if (!query) return { results: [] as any[] };

  const { supabase } = await requireUser();
  const results = await retrieveKnowledge({ supabase, query, topK: 8 });
  return { results };
}

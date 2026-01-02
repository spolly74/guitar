import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchKnowledge } from "./actions";
import { IngestPanel } from "./IngestPanel";

export default async function LibraryPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const docsRes = await supabase
    .from("knowledge_documents")
    .select("id, title, source_type, source_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (docsRes.error) throw new Error(docsRes.error.message);

  const initialResults =
    q.length > 0
      ? await (async () => {
          const fd = new FormData();
          fd.set("query", q);
          return await searchKnowledge(fd);
        })()
      : { results: [] };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="text-sm text-zinc-600">
          Add text notes and search them semantically (pgvector).
        </p>
      </div>

      <IngestPanel />

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-base font-semibold">Search</div>
        <form className="mt-3 flex flex-col gap-3" action="/library" method="get">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Query</span>
            <input
              name="q"
              defaultValue={q}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
              placeholder="ii–V–I shell voicings"
            />
          </label>
          <div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
            >
              Search
            </button>
          </div>
        </form>

        {q ? (
          <div className="mt-4 flex flex-col gap-3">
            {(initialResults as any).results?.length ? (
              (initialResults as any).results.map((r: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="text-xs text-zinc-500">
                    similarity: {Number(r.similarity).toFixed(3)}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                    {r.content}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-600">No results.</div>
            )}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="text-base font-semibold">Recent documents</div>
        {(docsRes.data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            No documents yet.
          </div>
        ) : (
          <div className="grid gap-2">
            {docsRes.data!.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="text-sm font-medium">{d.title}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {d.source_type}
                  {d.source_url ? ` · ${d.source_url}` : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

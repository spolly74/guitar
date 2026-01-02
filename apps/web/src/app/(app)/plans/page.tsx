import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createDefaultJazzTrack,
  createTrack,
  deleteTrackAndPlans,
  generateTodaysPlanForTrack,
} from "./actions";

type TrackKind = "program" | "song" | "technique" | "other";

export default async function PlansPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const tracksRes = await supabase
    .from("plan_tracks")
    .select("id, title, kind, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (tracksRes.error) throw new Error(tracksRes.error.message);

  const tracks = tracksRes.data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-zinc-600">
          Tracks are long-running goals (jazz program, song, technique). Each
          track can generate a daily plan.
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-base font-semibold">Create a track</div>
        <p className="mt-1 text-sm text-zinc-600">
          Example: “Punk Rock”, “Learn ‘Autumn Leaves’”, “Alternate picking”.
        </p>

        <form action={createTrack} className="mt-4 grid gap-3 sm:grid-cols-6">
          <label className="flex flex-col gap-1 sm:col-span-3">
            <span className="text-sm font-medium text-zinc-700">Title</span>
            <input
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
              name="title"
              placeholder="Punk Rock"
              required
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Kind</span>
            <select
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
              name="kind"
              defaultValue={"program" satisfies TrackKind}
            >
              <option value="program">Program</option>
              <option value="song">Song</option>
              <option value="technique">Technique</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="sm:col-span-1 sm:flex sm:items-end">
            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
              type="submit"
            >
              Create
            </button>
          </div>

          <label className="flex flex-col gap-1 sm:col-span-6">
            <span className="text-sm font-medium text-zinc-700">
              Description (optional)
            </span>
            <textarea
              className="min-h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 outline-none ring-zinc-900/10 focus:ring-4"
              name="description"
              placeholder="What’s the goal and what should the practice emphasize?"
            />
          </label>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Your tracks</div>
            <div className="text-sm text-zinc-600">
              Generate today’s plan per track. (Ad-hoc plans are created on
              Today.)
            </div>
          </div>

          {tracks.length === 0 ? (
            <form action={createDefaultJazzTrack}>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                type="submit"
              >
                Create “Beginner Jazz Guitar”
              </button>
            </form>
          ) : null}
        </div>

        {tracks.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            No tracks yet. Create one above (e.g. Punk Rock).
          </div>
        ) : (
          <div className="grid gap-3">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium">{t.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {t.kind}
                      {t.description ? ` · ${t.description}` : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <form action={generateTodaysPlanForTrack}>
                      <input type="hidden" name="plan_track_id" value={t.id} />
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white"
                        type="submit"
                      >
                        Generate today’s plan
                      </button>
                    </form>

                    <form action={deleteTrackAndPlans}>
                      <input type="hidden" name="plan_track_id" value={t.id} />
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                        type="submit"
                        title="Deletes the track and all plans created for it"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

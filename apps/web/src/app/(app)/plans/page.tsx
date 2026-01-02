import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createDefaultJazzTrack,
  deleteTrackAndPlans,
  generateTodaysPlanForTrack,
} from "./actions";
import { TrackWizardForm } from "./TrackWizardForm";

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
  const hasJazz = tracks.some((t) => t.title === "Beginner Jazz Guitar");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Learning paths</h1>
        <p className="text-sm text-zinc-600">
          Learning paths are long-running goals. Each path generates a daily lesson.
        </p>
      </div>

      <TrackWizardForm />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Your learning paths</div>
            <div className="text-sm text-zinc-600">
              Generate today’s lesson per learning path. (Ad-hoc lessons are created on
              Today.)
            </div>
          </div>

          {!hasJazz ? (
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
            No learning paths yet. Create one above (e.g. Punk Rock).
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
                        Generate today’s lesson
                      </button>
                    </form>

                    <form action={deleteTrackAndPlans}>
                      <input type="hidden" name="plan_track_id" value={t.id} />
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                        type="submit"
                        title="Deletes the learning path and all lessons created for it"
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

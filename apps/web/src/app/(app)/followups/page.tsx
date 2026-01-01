import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  markFollowupDone,
  reopenFollowup,
  snoozeFollowup7Days,
} from "./actions";

type FollowupStatus = "open" | "snoozed" | "done";

const STATUSES: FollowupStatus[] = ["open", "snoozed", "done"];

export default async function FollowupsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const status = (searchParams.status as FollowupStatus) ?? "open";
  const safeStatus: FollowupStatus = STATUSES.includes(status) ? status : "open";

  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const q = supabase
    .from("follow_ups")
    .select("id, title, status, snoozed_until, created_at, source_plan_id, source_exercise_slug")
    .eq("user_id", userId)
    .eq("status", safeStatus)
    .order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="text-sm text-zinc-600">
          Flag exercises to create follow-ups. Manage them here: open, snoozed, or
          done.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = s === safeStatus;
          return (
            <Link
              key={s}
              href={`/followups?status=${s}`}
              className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              {s === "open" ? "Open" : s === "snoozed" ? "Snoozed" : "Done"}
            </Link>
          );
        })}
      </div>

      {(data?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No {safeStatus} follow-ups.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data!.map((f) => {
            return (
              <div
                key={f.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium">
                      {f.title || "Untitled follow-up"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {f.source_exercise_slug
                        ? `Exercise: ${f.source_exercise_slug}`
                        : null}
                      {f.snoozed_until ? ` · Snoozed until ${f.snoozed_until}` : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {f.status !== "done" ? (
                      <form action={markFollowupDone}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
                        >
                          Mark done
                        </button>
                      </form>
                    ) : null}

                    {f.status !== "open" ? (
                      <form action={reopenFollowup}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
                        >
                          Reopen
                        </button>
                      </form>
                    ) : null}

                    {f.status === "open" ? (
                      <form action={snoozeFollowup7Days}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
                        >
                          Snooze 7 days
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

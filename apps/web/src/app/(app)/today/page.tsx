import { createSupabaseServerClient } from "@/lib/supabase/server";
import { coercePlanV1, type PlanBlockName, type PlanV1 } from "@/lib/plan/types";
import {
  createAdHocPlanForToday,
  createDefaultJazzTrackForUser,
  deletePlanForToday,
  generatePlanForToday,
} from "./actions";
import { ExerciseCard } from "./ExerciseCard";
import { TrackGenerator } from "./TrackGenerator";
import { AdHocWizard } from "./AdHocWizard";
import { ReflectionForm } from "./ReflectionForm";

const BLOCK_ORDER: PlanBlockName[] = ["warmup", "review", "new", "apply"];
const BLOCK_LABEL: Record<PlanBlockName, string> = {
  warmup: "Warmup",
  review: "Review",
  new: "New",
  apply: "Apply",
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function groupKey(planId: string | null, block: string, slug: string) {
  return `${planId ?? "adhoc"}::${block}::${slug}`;
}

export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const date = todayIsoDate();

  const tracksRes = await supabase
    .from("plan_tracks")
    .select("id, title")
    .order("created_at", { ascending: true });

  if (tracksRes.error) throw new Error(tracksRes.error.message);
  const tracks = tracksRes.data ?? [];
  const trackTitleById = new Map(tracks.map((t) => [t.id, t.title]));
  const hasJazz = tracks.some((t) => t.title === "Beginner Jazz Guitar");

  const plansRes = await supabase
    .from("plans")
    .select("id, title, focus_prompt, plan_json, plan_track_id, created_at")
    .eq("plan_date", date)
    .order("created_at", { ascending: true });

  if (plansRes.error) throw new Error(plansRes.error.message);

  const sessionRes = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("session_date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sessionId = sessionRes.data?.id ?? null;

  const logsRes = sessionId
    ? await supabase
        .from("exercise_logs")
        .select(
          "plan_id, block, exercise_slug, completed, minutes, notes, flagged_for_followup",
        )
        .eq("practice_session_id", sessionId)
    : { data: [], error: null as null };

  if (logsRes.error) throw new Error(logsRes.error.message);

  const logsByKey = new Map<
    string,
    {
      completed: boolean;
      minutes: number;
      notes: string;
      flagged_for_followup: boolean;
    }
  >();

  (logsRes.data ?? []).forEach((l) => {
    logsByKey.set(groupKey(l.plan_id ?? null, l.block, l.exercise_slug), {
      completed: Boolean(l.completed),
      minutes: Number(l.minutes ?? 0),
      notes: String(l.notes ?? ""),
      flagged_for_followup: Boolean(l.flagged_for_followup),
    });
  });

  const plans = plansRes.data ?? [];

  const reflectionRes = sessionId
    ? await supabase
        .from("practice_reflections")
        .select("plan_id, hard_notes, easy_notes, notes, confidence_json")
        .eq("practice_session_id", sessionId)
        .limit(1)
        .maybeSingle()
    : { data: null, error: null as null };

  if ((reflectionRes as any).error) {
    throw new Error((reflectionRes as any).error.message);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-zinc-600">Date: {date}</p>
      </div>

      {!hasJazz ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">
            Default learning path missing
          </div>
          <div className="mt-1 text-xs text-amber-900/80">
            Create the default “Beginner Jazz Guitar” learning path to generate jazz lessons
            alongside your other learning paths.
          </div>
          <form action={createDefaultJazzTrackForUser} className="mt-3">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-amber-900 px-3 text-sm font-medium text-white"
            >
              Create “Beginner Jazz Guitar”
            </button>
          </form>
        </div>
      ) : null}

      <TrackGenerator tracks={tracks} />
      <AdHocWizard />

      {plans.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="text-base font-medium">No lessons yet</div>
          <p className="mt-1 text-sm text-zinc-600">
            Create a simple ad-hoc lesson to start practicing.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={generatePlanForToday}>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
                type="submit"
              >
                Generate lesson for today
              </button>
            </form>
            <form action={createAdHocPlanForToday}>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                type="submit"
              >
                Create stub ad-hoc lesson
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {plans.map((p, idx) => {
        const plan = coercePlanV1(p.plan_json as unknown);
        if (!plan) {
          return (
            <div
              key={p.id}
              className="rounded-lg border border-zinc-200 bg-white p-6"
            >
              <div className="text-base font-medium">{p.title || "Untitled lesson"}</div>
              <p className="mt-1 text-sm text-zinc-600">
                This lesson has no valid `plan_json` yet. (Expected schema version
                1.0.)
              </p>
            </div>
          );
        }

        return (
          <PlanView
            key={p.id}
            planId={p.id}
            plan={plan}
            logsByKey={logsByKey}
            defaultOpen={plans.length === 1 || idx === 0}
            trackTitle={p.plan_track_id ? trackTitleById.get(p.plan_track_id) ?? "Unknown track" : "Ad-hoc"}
          />
        );
      })}

      <ReflectionForm
        planOptions={plans.map((p) => ({
          id: p.id,
          label: p.title || "Untitled lesson",
        }))}
        initial={{
          planId: (reflectionRes as any).data?.plan_id ?? null,
          hardNotes: String((reflectionRes as any).data?.hard_notes ?? ""),
          easyNotes: String((reflectionRes as any).data?.easy_notes ?? ""),
          notes: String((reflectionRes as any).data?.notes ?? ""),
          confidence: {
            warmup: Number((reflectionRes as any).data?.confidence_json?.warmup ?? 0),
            review: Number((reflectionRes as any).data?.confidence_json?.review ?? 0),
            new: Number((reflectionRes as any).data?.confidence_json?.new ?? 0),
            apply: Number((reflectionRes as any).data?.confidence_json?.apply ?? 0),
          },
        }}
      />
    </div>
  );
}

function PlanView(props: {
  planId: string;
  plan: PlanV1;
  logsByKey: Map<
    string,
    {
      completed: boolean;
      minutes: number;
      notes: string;
      flagged_for_followup: boolean;
    }
  >;
  defaultOpen: boolean;
  trackTitle: string;
}) {
  const blocksByName = new Map(props.plan.today_blocks.map((b) => [b.block, b]));

  return (
    <details
      className="rounded-lg border border-zinc-200 bg-white"
      open={props.defaultOpen}
    >
      <summary className="cursor-pointer list-none px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight">
              {props.plan.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                {props.trackTitle}
              </span>
              <span>
                {props.plan.today_blocks.reduce((acc, b) => acc + (b.minutes ?? 0), 0)}{" "}
                min
              </span>
            </div>
            {props.plan.focus_prompt ? (
              <div className="mt-2 line-clamp-2 text-sm text-zinc-600">
                {props.plan.focus_prompt}
              </div>
            ) : null}
          </div>
          <div className="shrink-0">
            <form action={deletePlanForToday}>
              <input type="hidden" name="plan_id" value={props.planId} />
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                title="Delete this plan (keeps your practice session)"
              >
                Delete plan
              </button>
            </form>
          </div>
        </div>
      </summary>

      <div className="border-t border-zinc-200 px-6 py-6">
        <div className="flex flex-col gap-4">
          {BLOCK_ORDER.map((blockName) => {
            const block = blocksByName.get(blockName);

            return (
              <div key={blockName} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-base font-semibold text-zinc-900">
                    {BLOCK_LABEL[blockName]}
                  </h2>
                  <div className="text-xs text-zinc-500">
                    {block?.minutes ?? 0} min
                  </div>
                </div>

                {block?.items?.length ? (
                  <div className="flex flex-col gap-3">
                    {block.items.map((item) => {
                      const key = groupKey(
                        props.planId,
                        blockName,
                        item.exercise_slug,
                      );
                      const existing = props.logsByKey.get(key);

                      return (
                        <ExerciseCard
                          key={key}
                          planId={props.planId}
                          block={blockName}
                          item={item}
                          initial={{
                            completed: existing?.completed ?? false,
                            minutes: existing?.minutes ?? (item.minutes ?? 0),
                            notes: existing?.notes ?? "",
                            flaggedForFollowup:
                              existing?.flagged_for_followup ?? false,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                    No exercises in this block yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}

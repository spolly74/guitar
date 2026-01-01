import { createSupabaseServerClient } from "@/lib/supabase/server";
import { coercePlanV1, type PlanBlockName, type PlanV1 } from "@/lib/plan/types";
import { createAdHocPlanForToday } from "./actions";
import { ExerciseCard } from "./ExerciseCard";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-zinc-600">Date: {date}</p>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="text-base font-medium">No plans yet</div>
          <p className="mt-1 text-sm text-zinc-600">
            Create a simple ad-hoc plan to start practicing. (We’ll replace this
            with the plan generator next.)
          </p>
          <form action={createAdHocPlanForToday} className="mt-4">
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
              type="submit"
            >
              Create ad-hoc plan for today
            </button>
          </form>
        </div>
      ) : null}

      {plans.map((p) => {
        const plan = coercePlanV1(p.plan_json as unknown);
        if (!plan) {
          return (
            <div
              key={p.id}
              className="rounded-lg border border-zinc-200 bg-white p-6"
            >
              <div className="text-base font-medium">{p.title || "Untitled"}</div>
              <p className="mt-1 text-sm text-zinc-600">
                This plan has no valid `plan_json` yet. (Expected schema version
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
          />
        );
      })}
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
}) {
  const blocksByName = new Map(props.plan.today_blocks.map((b) => [b.block, b]));

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-lg font-semibold tracking-tight">{props.plan.title}</div>
        {props.plan.focus_prompt ? (
          <p className="mt-1 text-sm text-zinc-600">{props.plan.focus_prompt}</p>
        ) : null}
      </div>

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
                  const key = groupKey(props.planId, blockName, item.exercise_slug);
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
                        flaggedForFollowup: existing?.flagged_for_followup ?? false,
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
    </section>
  );
}

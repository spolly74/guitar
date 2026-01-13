import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LearningPlan } from "@/lib/schemas/v2.schema";
import { CreatePathForm } from "./CreatePathForm";
import { PathCard } from "./PathCard";
import { Path } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function LearningPathsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const pathsRes = await supabase
    .from("learning_paths")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (pathsRes.error) throw new Error(pathsRes.error.message);

  const paths = pathsRes.data ?? [];

  // Group by status
  const activePaths = paths.filter(
    (p) => p.plan_status === "in_progress" || p.plan_status === "approved"
  );
  const draftPaths = paths.filter((p) => p.plan_status === "draft");
  const pausedPaths = paths.filter((p) => p.plan_status === "paused");
  const completedPaths = paths.filter((p) => p.plan_status === "completed");

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Learning Paths
        </h1>
        <p className="text-sm text-foreground-muted">
          Create structured learning paths with AI-generated curricula. Each path
          breaks down a topic into phases and daily lessons.
        </p>
      </div>

      <CreatePathForm pathCount={paths.length} />

      {draftPaths.length > 0 && (
        <PathSection
          title="Awaiting Approval"
          description="Review and approve these plans to start learning"
          paths={draftPaths}
          variant="draft"
        />
      )}

      {activePaths.length > 0 && (
        <PathSection
          title="Active Paths"
          description="Your current learning journeys"
          paths={activePaths}
          variant="active"
        />
      )}

      {pausedPaths.length > 0 && (
        <PathSection
          title="Paused"
          description="Resume these when you're ready"
          paths={pausedPaths}
          variant="paused"
        />
      )}

      {completedPaths.length > 0 && (
        <PathSection
          title="Completed"
          description="Paths you've finished"
          paths={completedPaths}
          variant="completed"
        />
      )}

      {paths.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle">
            <Path weight="duotone" className="h-7 w-7 text-accent" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            No learning paths yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-muted">
            Enter a topic above to create your first learning path. The AI will
            generate a structured curriculum for you to review and approve.
          </p>
        </div>
      )}
    </div>
  );
}

interface PathSectionProps {
  title: string;
  description: string;
  paths: Array<{
    id: string;
    title: string;
    description: string | null;
    goal: string | null;
    plan: unknown;
    plan_status: string;
    current_phase: number;
    current_day: number;
    total_days: number | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
  }>;
  variant: "draft" | "active" | "paused" | "completed";
}

function PathSection({ title, description, paths, variant }: PathSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <div className="text-base font-semibold text-foreground">{title}</div>
        <div className="text-sm text-foreground-muted">{description}</div>
      </div>

      <div className="grid gap-3">
        {paths.map((path) => (
          <PathCard
            key={path.id}
            id={path.id}
            title={path.title}
            description={path.description}
            goal={path.goal}
            plan={path.plan as LearningPlan | null}
            status={path.plan_status as "draft" | "approved" | "in_progress" | "paused" | "completed"}
            currentPhase={path.current_phase}
            currentDay={path.current_day}
            totalDays={path.total_days}
            createdAt={path.created_at}
            startedAt={path.started_at}
            completedAt={path.completed_at}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}

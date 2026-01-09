import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LearningPlan } from "@/lib/schemas/v2.schema";
import { CreatePathForm } from "./CreatePathForm";
import { PathCard } from "./PathCard";

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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Learning Paths</h1>
        <p className="text-sm text-zinc-600">
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
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="text-base font-medium">No learning paths yet</div>
          <p className="mt-1 text-sm text-zinc-600">
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
    <section className="flex flex-col gap-3">
      <div>
        <div className="text-base font-semibold">{title}</div>
        <div className="text-sm text-zinc-600">{description}</div>
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

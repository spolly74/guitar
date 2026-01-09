import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/paths/[id]/approve - Approve a learning path plan
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the current path
  const { data: path, error: fetchError } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (path.plan_status !== "draft") {
    return NextResponse.json(
      { error: "Only draft plans can be approved" },
      { status: 400 }
    );
  }

  if (!path.plan) {
    return NextResponse.json(
      { error: "No plan to approve" },
      { status: 400 }
    );
  }

  // Update the plan with approval timestamp and change status
  const updatedPlan = {
    ...path.plan,
    approved_at: new Date().toISOString(),
  };

  const { data: updatedPath, error: updateError } = await supabase
    .from("learning_paths")
    .update({
      plan: updatedPlan,
      plan_status: "approved",
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ path: updatedPath });
}

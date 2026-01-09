import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { chatWithLessonStream, type ChatContext } from "@/lib/ai/chatAgent";
import type { LessonV2Content, LearningPlan, DiagramSpec } from "@/lib/schemas/v2.schema";

const SendMessageSchema = z.object({
  thread_id: z.string().uuid(),
  message: z.string().min(1).max(5000),
});

// POST /api/lessons/[id]/chat - Send a message and get streaming response
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lessonId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { thread_id, message } = parsed.data;

  // Get the lesson
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*, learning_path:learning_paths(*)")
    .eq("id", lessonId)
    .eq("user_id", user.id)
    .single();

  if (lessonError) {
    if (lessonError.code === "PGRST116") {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    return NextResponse.json({ error: lessonError.message }, { status: 500 });
  }

  // Verify thread belongs to this lesson
  const { error: threadError } = await supabase
    .from("lesson_chat_threads")
    .select("id")
    .eq("id", thread_id)
    .eq("lesson_id", lessonId)
    .single();

  if (threadError) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get conversation history
  const { data: messages } = await supabase
    .from("lesson_chat_messages")
    .select("role, content")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true });

  // Save user message
  const { error: userMsgError } = await supabase
    .from("lesson_chat_messages")
    .insert({
      thread_id,
      role: "user",
      content: message,
    })
    .select()
    .single();

  if (userMsgError) {
    return NextResponse.json({ error: userMsgError.message }, { status: 500 });
  }

  // Build context
  const lessonContent = lesson.content as LessonV2Content;
  const learningPath = lesson.learning_path as {
    title: string;
    goal: string;
    plan: LearningPlan;
    current_day: number;
    current_phase: number;
  } | null;

  const context: ChatContext = {
    lesson: lessonContent,
    learningPath: learningPath
      ? {
          title: learningPath.title,
          goal: learningPath.goal,
          plan: learningPath.plan,
          currentDay: learningPath.current_day,
          currentPhase: learningPath.current_phase,
        }
      : undefined,
    conversationHistory: (messages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  };

  // Stream response
  const encoder = new TextEncoder();
  let fullResponse = "";
  const diagrams: DiagramSpec[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chatWithLessonStream(context, message)) {
          if (chunk.type === "text") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk.content })}\n\n`)
            );
          } else if (chunk.type === "done") {
            fullResponse = chunk.content;

            // Parse diagrams from response
            const diagramRegex = /```diagram\n([\s\S]*?)\n```/g;
            let match;
            while ((match = diagramRegex.exec(fullResponse)) !== null) {
              try {
                diagrams.push(JSON.parse(match[1]));
              } catch {
                // Skip invalid JSON
              }
            }

            // Save assistant message
            await supabase.from("lesson_chat_messages").insert({
              thread_id,
              role: "assistant",
              content: fullResponse,
              diagrams: diagrams.length > 0 ? diagrams : null,
            });

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  diagrams: diagrams.length > 0 ? diagrams : undefined,
                })}\n\n`
              )
            );
          }
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// GET /api/lessons/[id]/chat - Get all messages for active thread
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lessonId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create active thread
  const { data: thread } = await supabase
    .from("lesson_chat_threads")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("is_active", true)
    .single();

  if (!thread) {
    // Create new thread
    const { data: newThread, error: createError } = await supabase
      .from("lesson_chat_threads")
      .insert({ lesson_id: lessonId })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
      thread_id: newThread.id,
      messages: [],
    });
  }

  // Get messages
  const { data: messages, error: messagesError } = await supabase
    .from("lesson_chat_messages")
    .select("id, role, content, diagrams, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  return NextResponse.json({
    thread_id: thread.id,
    messages: messages ?? [],
  });
}

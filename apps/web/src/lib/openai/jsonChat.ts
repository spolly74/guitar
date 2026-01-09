import { requiredEnv } from "@/lib/server/requiredEnv";

export function plannerModel(): string {
  return process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini";
}

export async function openAiJsonChat(input: {
  system: string;
  user: unknown;
  temperature: number;
  model?: string;
  apiKey?: string;
}): Promise<unknown> {
  const apiKey = input.apiKey ?? requiredEnv("OPENAI_API_KEY");
  const model = input.model ?? plannerModel();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: JSON.stringify(input.user) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI JSON chat failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI JSON chat returned no content");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI JSON chat returned non-JSON content");
  }
}

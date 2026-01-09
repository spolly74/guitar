import { requiredEnv } from "@/lib/server/requiredEnv";

export function claudeModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  id: string;
  content: Array<{ type: "text"; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Send a message to Claude and get a response.
 */
export async function claudeChat(input: {
  system: string;
  messages: ClaudeMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
  apiKey?: string;
}): Promise<string> {
  const apiKey = input.apiKey ?? requiredEnv("ANTHROPIC_API_KEY");
  const model = input.model ?? claudeModel();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: input.max_tokens ?? 4096,
      temperature: input.temperature ?? 0.7,
      system: input.system,
      messages: input.messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error: ${res.status} ${text}`);
  }

  const json = (await res.json()) as ClaudeResponse;
  const textContent = json.content.find((c) => c.type === "text");
  if (!textContent) {
    throw new Error("Claude returned no text content");
  }

  return textContent.text;
}

/**
 * Send a message to Claude and parse the response as JSON.
 */
export async function claudeJsonChat<T = unknown>(input: {
  system: string;
  user: unknown;
  temperature?: number;
  max_tokens?: number;
  model?: string;
  apiKey?: string;
}): Promise<T> {
  // Use higher token limit for JSON responses to avoid truncation
  const maxTokens = input.max_tokens ?? 16384;

  const response = await claudeChat({
    ...input,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: JSON.stringify(input.user),
      },
    ],
  });

  // Extract JSON from response (Claude might wrap it in markdown code blocks)
  let jsonStr = response;

  // Try to extract from markdown code blocks first
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // Try to find raw JSON object/array
    const objMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
      jsonStr = objMatch[1];
    }
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    // Check if the response appears to be truncated
    const isTruncated = !jsonStr.trim().endsWith("}") && !jsonStr.trim().endsWith("]");
    if (isTruncated) {
      throw new Error(`Claude response was truncated. Try reducing the complexity of the request. Response ended with: ...${response.slice(-100)}`);
    }
    throw new Error(`Claude returned invalid JSON: ${e instanceof Error ? e.message : "parse error"}. Response: ${response.slice(0, 300)}`);
  }
}

/**
 * Stream a message from Claude.
 */
export async function* claudeChatStream(input: {
  system: string;
  messages: ClaudeMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
  apiKey?: string;
}): AsyncGenerator<string, void, unknown> {
  const apiKey = input.apiKey ?? requiredEnv("ANTHROPIC_API_KEY");
  const model = input.model ?? claudeModel();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: input.max_tokens ?? 4096,
      temperature: input.temperature ?? 0.7,
      system: input.system,
      messages: input.messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error: ${res.status} ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);
          if (event.type === "content_block_delta" && event.delta?.text) {
            yield event.delta.text;
          }
        } catch {
          // Ignore parse errors in stream
        }
      }
    }
  }
}

type VisionResult = {
  ocr_text: string;
  description: string;
  tags: string[];
};

export async function extractTextFromImageWithOpenAi(input: {
  bytes: Uint8Array;
  contentType: string;
}): Promise<VisionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const base64 = Buffer.from(input.bytes).toString("base64");
  const dataUrl = `data:${input.contentType};base64,${base64}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract useful practice-relevant information from guitar-related images. Return strict JSON with keys: ocr_text (string), description (string), tags (string[]).",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract any text you can read (OCR). If it looks like a chord diagram/fretboard/tab chart, describe what it shows in plain language that can be searched later. Keep it concise.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI vision failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI vision returned no content");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI vision returned non-JSON content");
  }

  return {
    ocr_text: String(parsed?.ocr_text ?? "").trim(),
    description: String(parsed?.description ?? "").trim(),
    tags: Array.isArray(parsed?.tags) ? parsed.tags.map((t: any) => String(t)) : [],
  };
}

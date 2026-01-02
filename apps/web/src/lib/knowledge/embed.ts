type EmbeddingModel = "text-embedding-3-small";

export type EmbeddingProvider = {
  embedMany: (texts: string[]) => Promise<number[][]>;
};

export function createEmbeddingProvider(): EmbeddingProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set it to enable embeddings/semantic search.",
    );
  }
  return createOpenAiEmbeddingProvider({ apiKey, model: "text-embedding-3-small" });
}

export function createOpenAiEmbeddingProvider(input: {
  apiKey: string;
  model: EmbeddingModel;
}): EmbeddingProvider {
  return {
    async embedMany(texts) {
      if (texts.length === 0) return [];
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          input: texts,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenAI embeddings failed: ${res.status} ${text}`);
      }

      const json = (await res.json()) as {
        data: Array<{ embedding: number[] }>;
      };

      return json.data.map((d) => d.embedding);
    },
  };
}

export function vectorToSql(embedding: number[]): string {
  // Postgres vector input format: '[1,2,3]'
  return `[${embedding.join(",")}]`;
}

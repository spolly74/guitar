import { chunkText } from "./chunk";
import { createEmbeddingProvider, vectorToSql } from "./embed";
import { fetchAndExtractReadableText, validateFetchUrl } from "./fetchExtract";
import { PDFParse } from "pdf-parse";
import { sha256Hex } from "@/lib/diagrams/stableHash";
import { extractTextFromImageWithOpenAi } from "./vision";
import {
  fetchYoutubeDescription,
  fetchYoutubeTitle,
  fetchYoutubeTranscriptText,
  normalizeYoutubeUrl,
} from "./youtube";

type SupabaseLike = {
  from: (table: string) => any;
  storage?: any;
};

export async function ingestTextDocument(input: {
  supabase: SupabaseLike;
  userId: string;
  title: string;
  rawText: string;
  sourceType?: "text" | "url" | "youtube" | "lesson" | "theory";
  sourceUrl?: string | null;
}) {
  const cleaned = input.rawText.trim();
  if (!cleaned) throw new Error("Document text is empty");

  const docRes = await input.supabase
    .from("knowledge_documents")
    .insert({
      user_id: input.userId,
      source_type: input.sourceType ?? "text",
      source_url: input.sourceUrl ?? null,
      title: input.title.trim(),
      raw_text: cleaned,
    })
    .select("id")
    .single();

  if (docRes.error) throw new Error(docRes.error.message);
  const documentId = docRes.data.id as string;

  const chunks = chunkText({ text: cleaned });
  const embedder = createEmbeddingProvider();
  const embeddings = await embedder.embedMany(chunks.map((c) => c.content));

  const rows = chunks.map((c, i) => ({
    user_id: input.userId,
    document_id: documentId,
    chunk_index: c.index,
    content: c.content,
    embedding: vectorToSql(embeddings[i]),
  }));

  const chunkRes = await input.supabase.from("knowledge_chunks").insert(rows);
  if (chunkRes.error) throw new Error(chunkRes.error.message);

  return { documentId, chunkCount: chunks.length };
}

export async function ingestUrlDocument(input: {
  supabase: SupabaseLike;
  userId: string;
  url: string;
  titleOverride?: string;
}) {
  const url = validateFetchUrl(input.url);
  const extracted = await fetchAndExtractReadableText({ url: url.toString() });
  return ingestTextDocument({
    supabase: input.supabase,
    userId: input.userId,
    title: input.titleOverride?.trim() || extracted.title,
    rawText: extracted.text,
    sourceType: "url",
    sourceUrl: url.toString(),
  });
}

function looksLikeAdOrJunk(meta: { alt: string; caption: string; url: string }) {
  const s = `${meta.alt} ${meta.caption} ${meta.url}`.toLowerCase();
  const bad = ["ad", "ads", "sponsor", "sponsored", "promo", "doubleclick", "banner", "pixel", "tracking", "logo", "icon"];
  return bad.some((k) => s.includes(k));
}

function extFromContentType(ct: string) {
  const c = ct.toLowerCase();
  if (c.includes("png")) return "png";
  if (c.includes("webp")) return "webp";
  if (c.includes("gif")) return "gif";
  if (c.includes("jpeg") || c.includes("jpg")) return "jpg";
  return "img";
}

async function fetchImageBytes(input: {
  url: string;
  maxBytes: number;
  timeoutMs?: number;
}): Promise<{ bytes: Uint8Array; contentType: string; size: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 12_000);
  const res = await fetch(input.url, {
    method: "GET",
    redirect: "follow",
    signal: controller.signal,
    headers: { "user-agent": "guitar-practice-app/0.1 (knowledge-ingest)" },
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Not an image: ${contentType}`);
  }
  const lenHeader = res.headers.get("content-length");
  if (lenHeader) {
    const len = Number(lenHeader);
    if (Number.isFinite(len) && len > input.maxBytes) {
      throw new Error("Image too large for remaining budget");
    }
  }
  const ab = await res.arrayBuffer();
  const bytes = new Uint8Array(ab);
  if (bytes.byteLength > input.maxBytes) {
    throw new Error("Image exceeds remaining budget");
  }
  return { bytes, contentType, size: bytes.byteLength };
}

async function nextChunkIndex(input: { supabase: SupabaseLike; documentId: string }) {
  const res = await input.supabase
    .from("knowledge_chunks")
    .select("chunk_index")
    .eq("document_id", input.documentId)
    .order("chunk_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error && res.error.code !== "PGRST116") throw new Error(res.error.message);
  return (res.data?.chunk_index ?? -1) + 1;
}

export async function ingestUrlWithImages(input: {
  supabase: SupabaseLike;
  userId: string;
  url: string;
  titleOverride?: string;
  includeImages: boolean;
  maxTotalImageBytes?: number; // default 5MB
  maxImages?: number; // default 10
}) {
  const url = validateFetchUrl(input.url);
  const extracted = await fetchAndExtractReadableText({ url: url.toString() });

  const { documentId, chunkCount } = await ingestTextDocument({
    supabase: input.supabase,
    userId: input.userId,
    title: input.titleOverride?.trim() || extracted.title,
    rawText: extracted.text,
    sourceType: "url",
    sourceUrl: url.toString(),
  });

  if (!input.includeImages) {
    return { documentId, chunkCount, imageCount: 0, imageBytes: 0 };
  }

  if (!input.supabase.storage) {
    throw new Error("Supabase Storage not available on client");
  }

  const maxTotal = input.maxTotalImageBytes ?? 5 * 1024 * 1024;
  const maxImages = input.maxImages ?? 10;
  let remaining = maxTotal;

  const candidates = extracted.images
    .filter((c) => !looksLikeAdOrJunk({ alt: c.alt, caption: c.caption, url: c.url }))
    .slice(0, maxImages);

  const embedder = createEmbeddingProvider();
  let nextIndex = await nextChunkIndex({ supabase: input.supabase, documentId });

  let ingested = 0;
  let totalBytes = 0;

  for (const img of candidates) {
    if (remaining <= 0) break;

    try {
      const fetched = await fetchImageBytes({
        url: img.url,
        maxBytes: Math.min(remaining, 2 * 1024 * 1024),
      });

      const ext = extFromContentType(fetched.contentType);
      const nameHash = sha256Hex(img.url).slice(0, 24);
      const storagePath = `${input.userId}/${documentId}/${nameHash}.${ext}`;

      const upload = await input.supabase.storage
        .from("knowledge-images")
        .upload(storagePath, fetched.bytes, {
          contentType: fetched.contentType,
          upsert: true,
        });
      if (upload.error) throw new Error(upload.error.message);

      // Vision OCR/summary
      const vision = await extractTextFromImageWithOpenAi({
        bytes: fetched.bytes,
        contentType: fetched.contentType,
      });

      const combined = [
        `Image from: ${img.url}`,
        img.alt ? `Alt: ${img.alt}` : "",
        img.caption ? `Caption: ${img.caption}` : "",
        vision.description ? `Description: ${vision.description}` : "",
        vision.ocr_text ? `OCR:\n${vision.ocr_text}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Store image record
      const imgRow = await input.supabase.from("knowledge_images").insert({
        user_id: input.userId,
        document_id: documentId,
        source_url: img.url,
        storage_path: storagePath,
        content_type: fetched.contentType,
        bytes: fetched.size,
        alt_text: img.alt,
        caption: img.caption,
        ocr_text: vision.ocr_text,
        vision_summary: vision.description,
      });
      if (imgRow.error) throw new Error(imgRow.error.message);

      if (combined.trim().length > 0) {
        const [embedding] = await embedder.embedMany([combined]);
        const chunkIns = await input.supabase.from("knowledge_chunks").insert([
          {
            user_id: input.userId,
            document_id: documentId,
            chunk_index: nextIndex++,
            content: combined,
            embedding: vectorToSql(embedding),
          },
        ]);
        if (chunkIns.error) throw new Error(chunkIns.error.message);
      }

      ingested += 1;
      totalBytes += fetched.size;
      remaining -= fetched.size;
    } catch {
      // Skip failures per-image (keep ingestion resilient)
      continue;
    }
  }

  return { documentId, chunkCount, imageCount: ingested, imageBytes: totalBytes };
}

export async function ingestPdfDocument(input: {
  supabase: SupabaseLike;
  userId: string;
  title: string;
  pdfBytes: Uint8Array;
}) {
  const parser = new PDFParse({ data: input.pdfBytes });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = (parsed.text ?? "").trim();
  if (!text) throw new Error("No extractable text found in PDF");

  return ingestTextDocument({
    supabase: input.supabase,
    userId: input.userId,
    title: input.title.trim(),
    rawText: text,
    sourceType: "text",
    sourceUrl: null,
  });
}

export async function ingestYoutubeTranscript(input: {
  supabase: SupabaseLike;
  userId: string;
  youtubeUrl: string;
  titleOverride?: string;
  lang?: string;
  allowMetadataFallback?: boolean;
}) {
  const youtubeUrl = normalizeYoutubeUrl(input.youtubeUrl);
  const title =
    input.titleOverride?.trim() ||
    (await fetchYoutubeTitle({ youtubeUrl })) ||
    "YouTube transcript";

  try {
    const transcript = await fetchYoutubeTranscriptText({
      youtubeUrl,
      lang: input.lang ?? "en",
    });

    return {
      ...(await ingestTextDocument({
        supabase: input.supabase,
        userId: input.userId,
        title,
        rawText: transcript.text,
        sourceType: "youtube",
        sourceUrl: youtubeUrl,
      })),
      mode: "transcript" as const,
    };
  } catch (e) {
    if (!input.allowMetadataFallback) throw e;

    const desc = await fetchYoutubeDescription({ youtubeUrl });
    const fallbackText = [
      `YouTube URL: ${youtubeUrl}`,
      `Title: ${title}`,
      desc ? `Description:\n${desc}` : "",
      "",
      "(No transcript available; ingested metadata only.)",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    return {
      ...(await ingestTextDocument({
        supabase: input.supabase,
        userId: input.userId,
        title,
        rawText: fallbackText,
        sourceType: "youtube",
        sourceUrl: youtubeUrl,
      })),
      mode: "metadata" as const,
    };
  }
}

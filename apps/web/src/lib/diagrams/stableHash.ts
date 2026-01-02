import { createHash } from "crypto";

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function canonicalize(value: unknown): Json {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (isPlainObject(value)) {
    const out: Record<string, Json> = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) {
      out[k] = canonicalize((value as Record<string, unknown>)[k]);
    }
    return out;
  }

  // Functions, Dates, etc are not expected; stringify as string to be safe/deterministic.
  return String(value);
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

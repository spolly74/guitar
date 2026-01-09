import { z } from "zod";
import type { ChordDiagramSpec } from "./chordSpec";
import type { FretboardDiagramSpec } from "./fretboardSpec";
import {
  ChordDiagramSpecSchema,
  FretboardDiagramSpecSchema,
  DiagramSpecSchema,
} from "@/lib/schemas/diagram.schema";

export type ValidationMode = "strict" | "permissive";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: ValidationError[] };

export type ValidationError = {
  path: string;
  message: string;
  code: string;
};

/**
 * Validate a ChordDiagramSpec with configurable strictness.
 *
 * @param spec - The chord diagram spec to validate
 * @param mode - "strict" fails fast on first error, "permissive" collects all errors
 * @returns Validation result with typed data or error list
 */
export function validateChordSpec(
  spec: unknown,
  mode: ValidationMode = "strict",
): ValidationResult<ChordDiagramSpec> {
  try {
    const validated = ChordDiagramSpecSchema.parse(spec);
    return { ok: true, data: validated as ChordDiagramSpec };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errors: ValidationError[] = (e as any).errors.map((err: any) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      // In strict mode, we only return the first error for fast failure
      if (mode === "strict" && errors.length > 0) {
        return { ok: false, errors: [errors[0]!] };
      }

      return { ok: false, errors };
    }

    // Non-Zod errors
    return {
      ok: false,
      errors: [
        {
          path: "",
          message: e instanceof Error ? e.message : "Unknown validation error",
          code: "unknown_error",
        },
      ],
    };
  }
}

/**
 * Validate a FretboardDiagramSpec with configurable strictness.
 *
 * @param spec - The fretboard diagram spec to validate
 * @param mode - "strict" fails fast on first error, "permissive" collects all errors
 * @returns Validation result with typed data or error list
 */
export function validateFretboardSpec(
  spec: unknown,
  mode: ValidationMode = "strict",
): ValidationResult<FretboardDiagramSpec> {
  try {
    const validated = FretboardDiagramSpecSchema.parse(spec);
    return { ok: true, data: validated as FretboardDiagramSpec };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errors: ValidationError[] = (e as any).errors.map((err: any) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      if (mode === "strict" && errors.length > 0) {
        return { ok: false, errors: [errors[0]!] };
      }

      return { ok: false, errors };
    }

    return {
      ok: false,
      errors: [
        {
          path: "",
          message: e instanceof Error ? e.message : "Unknown validation error",
          code: "unknown_error",
        },
      ],
    };
  }
}

/**
 * Validate any diagram spec (chord or fretboard).
 *
 * @param spec - The diagram spec to validate
 * @param mode - "strict" fails fast on first error, "permissive" collects all errors
 * @returns Validation result with typed data or error list
 */
export function validateDiagramSpec(
  spec: unknown,
  mode: ValidationMode = "strict",
): ValidationResult<ChordDiagramSpec | FretboardDiagramSpec> {
  try {
    const validated = DiagramSpecSchema.parse(spec);
    return {
      ok: true,
      data: validated as ChordDiagramSpec | FretboardDiagramSpec,
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errors: ValidationError[] = (e as any).errors.map((err: any) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      if (mode === "strict" && errors.length > 0) {
        return { ok: false, errors: [errors[0]!] };
      }

      return { ok: false, errors };
    }

    return {
      ok: false,
      errors: [
        {
          path: "",
          message: e instanceof Error ? e.message : "Unknown validation error",
          code: "unknown_error",
        },
      ],
    };
  }
}

/**
 * Safe parse that returns undefined on failure instead of throwing.
 * Useful for graceful degradation.
 */
export function safeParseDiagramSpec(
  spec: unknown,
): ChordDiagramSpec | FretboardDiagramSpec | undefined {
  const result = validateDiagramSpec(spec, "strict");
  return result.ok ? result.data : undefined;
}

/**
 * Format validation errors into a human-readable string for logging or display.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "No errors";
  if (errors.length === 1) {
    const e = errors[0]!;
    return `${e.path ? `${e.path}: ` : ""}${e.message}`;
  }
  return errors
    .map((e, i) => `${i + 1}. ${e.path ? `${e.path}: ` : ""}${e.message}`)
    .join("\n");
}

/**
 * Additional semantic validation beyond Zod schema.
 * These are "soft" checks that don't fail validation but generate warnings.
 */
export function getSemanticWarnings(spec: ChordDiagramSpec | FretboardDiagramSpec): string[] {
  const warnings: string[] = [];

  if (spec.type === "chord") {
    // Warn if no root strings are marked (could be intentional for exercises)
    if (!spec.root_strings || spec.root_strings.length === 0) {
      const hasRootRoles = spec.note_roles?.some((r) => r === "root");
      if (!hasRootRoles) {
        warnings.push("No root notes marked (consider adding root_strings or note_roles)");
      }
    }

    // Warn if finger_numbers are provided but look suspicious (e.g., all same finger)
    if (spec.finger_numbers) {
      const nonNull = spec.finger_numbers.filter((f) => f !== null);
      if (nonNull.length > 0 && new Set(nonNull).size === 1) {
        warnings.push("All finger numbers are the same (verify fingering)");
      }
    }

    // Warn if base_fret seems too high for a typical chord
    if (spec.base_fret && spec.base_fret > 15) {
      warnings.push(`base_fret is unusually high (${spec.base_fret}) - verify this is correct`);
    }
  }

  if (spec.type === "fretboard") {
    // Warn if fret_range is very large
    const [start, end] = spec.fret_range;
    if (end - start > 12) {
      warnings.push(`fret_range is very wide (${end - start} frets) - consider splitting into multiple diagrams`);
    }

    // Warn if no markers
    if (spec.markers.length === 0) {
      warnings.push("No markers defined (diagram will be empty)");
    }

    // Warn if markers are outside the fret_range
    const outOfRange = spec.markers.filter((m) => m.fret < start || m.fret > end);
    if (outOfRange.length > 0) {
      warnings.push(
        `${outOfRange.length} marker(s) outside fret_range [${start}, ${end}] and will not render`,
      );
    }
  }

  return warnings;
}

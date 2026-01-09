import { z } from "zod";
import type { ChordDiagramSpec } from "@/lib/diagrams/chordSpec";
import type { FretboardDiagramSpec } from "@/lib/diagrams/fretboardSpec";

export type DiagramSpec = ChordDiagramSpec | FretboardDiagramSpec;

// Zod schema for NoteRole
export const NoteRoleSchema = z.enum(["root", "third", "fifth", "seventh", "extension", "other"]);

// Zod schema for ChordDiagramSpec
export const ChordDiagramSpecSchema = z.object({
  type: z.literal("chord"),
  style: z.literal("jazz-clean-v1"),
  title: z.string().optional(),
  tuning: z.array(z.string()).length(6),
  frets: z
    .array(z.number().int().min(0).max(24).nullable())
    .length(6)
    .refine((frets) => frets.some((f) => f !== null), {
      message: "At least one string must be fretted (not all muted)",
    }),
  base_fret: z.number().int().min(1).max(24).optional(),
  finger_numbers: z.array(z.number().int().min(1).max(4).nullable()).length(6).optional(),
  note_roles: z.array(NoteRoleSchema.nullable()).length(6).optional(),
  root_strings: z.array(z.number().int().min(0).max(5)).optional(),
  mutedStrings: z.array(z.number().int().min(0).max(5)).optional(),
  openStrings: z.array(z.number().int().min(0).max(5)).optional(),
});

// Zod schema for FretboardMarker
export const FretboardMarkerSchema = z.object({
  string: z.number().int().min(1).max(6),
  fret: z.number().int().min(0).max(24),
  label: z.string().optional(),
  role: z.enum(["root", "chord-tone", "scale-tone", "other"]).optional(),
  shape: z.literal("circle").optional(),
});

// Zod schema for FretboardDiagramSpec
export const FretboardDiagramSpecSchema = z.object({
  type: z.literal("fretboard"),
  style: z.literal("jazz-clean-v1"),
  title: z.string().optional(),
  tuning: z.array(z.string()).length(6),
  fret_range: z
    .tuple([z.number().int().min(0).max(24), z.number().int().min(0).max(24)])
    .refine(([start, end]) => end > start, {
      message: "fret_range[1] must be greater than fret_range[0]",
    }),
  markers: z.array(FretboardMarkerSchema),
  show_fret_numbers: z.boolean().optional(),
  color_by_role: z.boolean().optional(),
});

// Union schema for any diagram spec
export const DiagramSpecSchema = z.union([ChordDiagramSpecSchema, FretboardDiagramSpecSchema]);

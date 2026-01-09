# Schemas - Single Source of Truth

**Version**: 1.0 (Updated 2026-01-08)

This document is the **canonical reference** for all JSON data contracts in the Guitar Practice App. All implementations (TypeScript types, Zod schemas, AI agent prompts) must match these specifications.

---

## Table of Contents

1. [Plan (Lesson) Schema](#plan-lesson-schema)
2. [Chord Diagram Schema](#chord-diagram-schema)
3. [Fretboard Diagram Schema](#fretboard-diagram-schema)
4. [Note Marker Schema](#note-marker-schema)
5. [String Numbering Convention](#string-numbering-convention)
6. [Validation Rules](#validation-rules)

---

## Plan (Lesson) Schema

**Type**: `PlanV1` / `LessonV1` (aliases)
**Version**: `1.0`

A Plan represents a single day's practice session with structured exercises organized into blocks.

### JSON Schema

```json
{
  "version": "1.0",
  "date": "YYYY-MM-DD",
  "title": "string",
  "focus_prompt": "string",
  "assumptions": {
    "level": "beginner",
    "daily_minutes_target": 30,
    "instrument": "right-handed 6-string guitar",
    "tuning": "EADGBE"
  },
  "today_blocks": [
    {
      "block": "warmup" | "review" | "new" | "apply",
      "minutes": 5,
      "items": [
        {
          "exercise_slug": "unique-slug",
          "name": "Exercise Name",
          "minutes": 5,
          "instructions_md": "Markdown instructions (optional)",
          "tab_text": "Tab notation (optional)",
          "diagram_specs": [
            { /* ChordDiagramSpec or FretboardDiagramSpec */ }
          ],
          "concept_tags": ["tag1", "tag2"],
          "common_mistakes": ["mistake description"],
          "success_criteria": ["success description"]
        }
      ]
    }
  ],
  "review_logic": {
    "include_open_followups": true,
    "prefer_recent_days": 7
  },
  "sources": [
    { /* metadata objects */ }
  ]
}
```

### TypeScript Type

```typescript
type PlanV1 = {
  version: "1.0";
  date: string; // YYYY-MM-DD format
  title: string;
  focus_prompt: string;
  assumptions?: {
    level: "beginner";
    daily_minutes_target: number;
    instrument: string;
    tuning: string;
  };
  today_blocks: PlanBlock[];
  review_logic?: {
    include_open_followups: boolean;
    prefer_recent_days: number;
  };
  sources?: unknown[];
};

type PlanBlock = {
  block: "warmup" | "review" | "new" | "apply";
  minutes: number;
  items: ExerciseItem[];
};

type ExerciseItem = {
  exercise_slug: string;
  name: string;
  minutes: number;
  instructions_md?: string;
  tab_text?: string;
  diagram_specs?: DiagramSpec[];
  concept_tags?: string[];
  common_mistakes?: string[];
  success_criteria?: string[];
};
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `"1.0"` | ✅ | Schema version for future compatibility |
| `date` | `string` | ✅ | ISO date format (YYYY-MM-DD) |
| `title` | `string` | ✅ | Human-readable lesson title |
| `focus_prompt` | `string` | ✅ | Original user prompt that generated this plan |
| `assumptions` | `object` | ❌ | Default assumptions about the student |
| `assumptions.level` | `"beginner"` | ❌ | Skill level (v1 only supports beginner) |
| `assumptions.daily_minutes_target` | `number` | ❌ | Target practice duration |
| `assumptions.instrument` | `string` | ❌ | Instrument description |
| `assumptions.tuning` | `string` | ❌ | Guitar tuning (default: EADGBE) |
| `today_blocks` | `array` | ✅ | List of practice blocks (must have all 4 types) |
| `review_logic` | `object` | ❌ | **Optional** - Logic for review block content |
| `review_logic.include_open_followups` | `boolean` | ❌ | Whether to pull from flagged concepts |
| `review_logic.prefer_recent_days` | `number` | ❌ | How many days back to prioritize |
| `sources` | `array` | ❌ | Metadata about AI agents, RAG sources, etc. |

### Validation Rules

- `today_blocks` must contain exactly 4 blocks: warmup, review, new, apply (in any order)
- Each `block` enum value must be unique within `today_blocks`
- `minutes` must be non-negative integers
- `exercise_slug` must be unique within a plan
- `date` must be valid ISO date string

---

## Chord Diagram Schema

**Type**: `ChordDiagramSpec`
**Style**: `jazz-clean-v1`

Represents a vertical chord box diagram showing finger positions on the fretboard.

### JSON Schema

```json
{
  "type": "chord",
  "style": "jazz-clean-v1",
  "title": "Dm7 (x5x56x)",
  "tuning": ["E2", "A2", "D3", "G3", "B3", "E4"],
  "frets": [null, 5, null, 5, 6, null],
  "base_fret": 5,
  "finger_numbers": [null, 1, null, 2, 3, null],
  "note_roles": [null, "root", null, "seventh", "third", null],
  "root_strings": [1]
}
```

### TypeScript Type

```typescript
type ChordDiagramSpec = {
  type: "chord";
  style: "jazz-clean-v1";
  title?: string;
  tuning: string[]; // length 6

  // PRIMARY DATA
  frets: Array<number | null>; // length 6, indices 0-5 (low E to high E)
  base_fret?: number;

  // PEDAGOGICAL METADATA (optional)
  finger_numbers?: Array<number | null>; // 1-4 or null, aligned with frets
  note_roles?: Array<NoteRole | null>; // 'root', 'third', etc.

  // CONVENIENCE FIELDS
  root_strings?: number[]; // indices 0-5 where root notes appear
  mutedStrings?: number[]; // indices 0-5, derived from frets (where null)
  openStrings?: number[]; // indices 0-5, derived from frets (where 0)
};

type NoteRole = "root" | "third" | "fifth" | "seventh" | "extension" | "other";
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"chord"` | ✅ | Discriminator for diagram type |
| `style` | `"jazz-clean-v1"` | ✅ | Visual rendering style |
| `title` | `string` | ❌ | Chord name or description |
| `tuning` | `string[]` | ✅ | 6 note names in scientific pitch notation |
| `frets` | `Array<number \| null>` | ✅ | 6 values: null=muted, 0=open, 1-24=fret |
| `base_fret` | `number` | ❌ | Starting fret for the diagram window (auto-inferred if omitted) |
| `finger_numbers` | `Array<number \| null>` | ❌ | Suggested fingering (1-4 for fingers, null for no suggestion) |
| `note_roles` | `Array<NoteRole \| null>` | ❌ | Musical role of each note |
| `root_strings` | `number[]` | ❌ | Indices of root note strings (for coloring) |
| `mutedStrings` | `number[]` | ❌ | Derived from frets array |
| `openStrings` | `number[]` | ❌ | Derived from frets array |

### Array Indexing Convention

**IMPORTANT**: The `frets`, `finger_numbers`, and `note_roles` arrays use **internal indexing** (0-5):
- Index 0 = String 6 (low E)
- Index 1 = String 5 (A)
- Index 2 = String 4 (D)
- Index 3 = String 3 (G)
- Index 4 = String 2 (B)
- Index 5 = String 1 (high E)

See [String Numbering Convention](#string-numbering-convention) for details.

### Example: Open Am Chord

```json
{
  "type": "chord",
  "style": "jazz-clean-v1",
  "title": "Am (x02210)",
  "tuning": ["E2", "A2", "D3", "G3", "B3", "E4"],
  "frets": [null, 0, 2, 2, 1, 0],
  "base_fret": 1,
  "finger_numbers": [null, 0, 2, 3, 1, 0],
  "note_roles": [null, "root", "fifth", "root", "third", "fifth"],
  "root_strings": [1, 3]
}
```

### Validation Rules

- `frets` array must have length 6
- Fret values must be `null` or integers 0-24
- At least one fret must be non-null (can't be all muted)
- `base_fret` must be 1-24 if provided
- `finger_numbers` must be `null` or integers 1-4, length 6 if provided
- `tuning` must have length 6
- `root_strings` values must be 0-5 if provided

---

## Fretboard Diagram Schema

**Type**: `FretboardDiagramSpec`
**Style**: `jazz-clean-v1`

Represents a horizontal section of the fretboard showing notes across multiple strings and frets (for scales, arpeggios, etc.).

### JSON Schema

```json
{
  "type": "fretboard",
  "style": "jazz-clean-v1",
  "title": "C Major Scale (Open Position)",
  "tuning": ["E2", "A2", "D3", "G3", "B3", "E4"],
  "fret_range": [0, 5],
  "markers": [
    { "string": 6, "fret": 3, "label": "C", "role": "root" },
    { "string": 5, "fret": 3, "label": "C", "role": "root" },
    { "string": 4, "fret": 0, "label": "D", "role": "scale-tone" },
    { "string": 4, "fret": 2, "label": "E", "role": "scale-tone" }
  ],
  "show_fret_numbers": true,
  "color_by_role": true
}
```

### TypeScript Type

```typescript
type FretboardDiagramSpec = {
  type: "fretboard";
  style: "jazz-clean-v1";
  title?: string;
  tuning: string[]; // length 6
  fret_range: [number, number]; // [start, end], end > start
  markers: FretboardMarker[];
  show_fret_numbers?: boolean;
  color_by_role?: boolean;
};

type FretboardMarker = {
  string: number; // 1-6 (user-facing string number)
  fret: number; // 0-24
  label?: string; // text to display in marker
  role?: "root" | "chord-tone" | "scale-tone" | "other";
  shape?: "circle"; // future: other shapes
};
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"fretboard"` | ✅ | Discriminator for diagram type |
| `style` | `"jazz-clean-v1"` | ✅ | Visual rendering style |
| `title` | `string` | ❌ | Scale/arpeggio name or description |
| `tuning` | `string[]` | ✅ | 6 note names in scientific pitch notation |
| `fret_range` | `[number, number]` | ✅ | Start and end frets (inclusive range) |
| `markers` | `FretboardMarker[]` | ✅ | List of notes to display on fretboard |
| `show_fret_numbers` | `boolean` | ❌ | Show fret numbers below diagram (default: true) |
| `color_by_role` | `boolean` | ❌ | Use different colors for different roles (default: true) |

### Marker Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `string` | `number` | ✅ | String number 1-6 (1=high E, 6=low E) **user-facing** |
| `fret` | `number` | ✅ | Fret number 0-24 (0=open) |
| `label` | `string` | ❌ | Text label inside marker circle |
| `role` | `enum` | ❌ | Musical role for coloring |
| `shape` | `"circle"` | ❌ | Marker shape (future extension) |

### String Numbering in Markers

**IMPORTANT**: `FretboardMarker.string` uses **user-facing numbering** (1-6):
- String 1 = high E
- String 6 = low E

This is different from chord diagram arrays which use internal indexing (0-5).

### Validation Rules

- `fret_range[1]` must be greater than `fret_range[0]`
- `fret_range` values must be 0-24
- `markers[].string` must be 1-6
- `markers[].fret` must be 0-24
- `tuning` must have length 6

---

## Note Marker Schema

**Type**: `NoteMarker` (Conceptual)

This is the canonical conceptual model for a note on the guitar, though individual diagram types may use specialized formats.

### TypeScript Type

```typescript
type NoteMarker = {
  string: number; // 1-6 (user-facing: 1=high E, 6=low E)
  fret: number; // 0-24 (0=open)
  finger?: number; // 1-4 (fingering hint)
  role?: NoteRole; // musical role
};

type NoteRole = "root" | "third" | "fifth" | "seventh" | "extension" | "other";
```

This type is used as a reference but may not appear directly in JSON payloads. Chord diagrams use the `frets` array format, while fretboard diagrams use `FretboardMarker` format.

---

## String Numbering Convention

**Critical Convention**: The application uses different numbering systems for different contexts.

### External API / User-Facing / AI Agents

**Use 1-6 numbering:**
- String 1 = high E (thinnest string)
- String 2 = B
- String 3 = G
- String 4 = D
- String 5 = A
- String 6 = low E (thickest string)

**Used in:**
- `FretboardMarker.string` field
- AI agent prompts and responses
- User-facing documentation
- API request/response payloads

### Internal Arrays (TypeScript Implementation)

**Use 0-5 indexing (low to high):**
- Index 0 = String 6 (low E)
- Index 1 = String 5 (A)
- Index 2 = String 4 (D)
- Index 3 = String 3 (G)
- Index 4 = String 2 (B)
- Index 5 = String 1 (high E)

**Used in:**
- `ChordDiagramSpec.frets` array
- `ChordDiagramSpec.finger_numbers` array
- `ChordDiagramSpec.note_roles` array
- `ChordDiagramSpec.root_strings` array
- Internal processing and rendering

### Conversion Helpers

TypeScript helper functions are available for conversion:

```typescript
// apps/web/src/lib/diagrams/noteMarker.ts

function stringNumberToIndex(stringNum: number): number {
  // String 1 → index 5, String 6 → index 0
  return 6 - stringNum;
}

function stringIndexToNumber(index: number): number {
  // Index 0 → string 6, Index 5 → string 1
  return 6 - index;
}
```

---

## Validation Rules

### General Principles

1. **No Silent Corrections**: Invalid data should fail validation with clear error messages, not be silently fixed
2. **Strict Mode Available**: Validation can run in strict mode (fail-fast) or permissive mode (collect all errors)
3. **AI-Friendly Errors**: Error messages should be actionable for AI agents to fix issues

### Chord Diagram Validation

```typescript
// Validation rules enforced by ChordDiagramSpecSchema
- type === "chord"
- style === "jazz-clean-v1"
- frets.length === 6
- frets values: null or 0-24
- At least one frets[i] !== null
- base_fret: 1-24 (if provided)
- finger_numbers.length === 6 (if provided)
- finger_numbers values: null or 1-4
- note_roles.length === 6 (if provided)
- root_strings values: 0-5
- tuning.length === 6
```

### Fretboard Diagram Validation

```typescript
// Validation rules enforced by FretboardDiagramSpecSchema
- type === "fretboard"
- style === "jazz-clean-v1"
- tuning.length === 6
- fret_range[0] < fret_range[1]
- fret_range values: 0-24
- markers[].string: 1-6
- markers[].fret: 0-24
- markers[].role: valid enum value
```

### Plan Validation

```typescript
// Validation rules enforced by PlanV1Schema
- version === "1.0"
- date matches YYYY-MM-DD format
- today_blocks contains exactly 4 blocks
- Each block type appears exactly once
- block enum: "warmup" | "review" | "new" | "apply"
- minutes >= 0
- exercise_slug is unique within plan
```

---

## Implementation References

### Zod Schemas

All validation schemas are implemented in:
```
apps/web/src/lib/schemas/diagram.schema.ts
apps/web/src/lib/plan/schema.ts
```

### TypeScript Types

Type definitions are in:
```
apps/web/src/lib/diagrams/chordSpec.ts
apps/web/src/lib/diagrams/fretboardSpec.ts
apps/web/src/lib/diagrams/noteMarker.ts
apps/web/src/lib/plan/schema.ts
```

### Rendering

SVG rendering implementations:
```
apps/web/src/lib/diagrams/renderChordSvg.ts
apps/web/src/lib/diagrams/renderFretboardSvg.ts
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-08 | Complete rewrite as single source of truth. Added pedagogical metadata to ChordDiagramSpec. Clarified string numbering convention. Added comprehensive validation rules. |
| 0.1 | 2025-XX-XX | Initial draft with basic schemas. |

---

**End of Schemas Document**

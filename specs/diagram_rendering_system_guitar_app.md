# Diagram Rendering System – Guitar App

**Last Updated**: 2026-01-08

This document defines a **deterministic, high‑quality diagram rendering system** for guitar chord diagrams and fretboard diagrams. The system is designed to work with AI-generated *instructions*, not AI-generated images, ensuring accuracy, consistency, and visual coherence.

**NOTE**: For the canonical JSON schema definitions, see [schemas.md](./schemas.md). This document provides implementation guidance and visual design specifications.

---

## Design Goals

1. **Deterministic Rendering**  
   The same input data always produces the same diagram.

2. **AI-Safe Contracts**  
   AI generates *instructions*, never pixels.

3. **Pedagogical Clarity**  
   Diagrams must be readable at a glance and consistent across lessons.

4. **Reusable & Extensible**  
   Same rendering engine supports chord boxes, scale maps, arpeggios, etc.

---

## Rendering Strategy

- **Rendering technology**: SVG (primary)
- **Fallback**: Canvas (optional, later)
- **Why SVG**:
  - Scales cleanly on all devices
  - Easy to test and debug
  - Easy to animate later

---

## Diagram Types

### 1. Chord Diagram (Vertical Box)

Represents a compact chord shape, typically covering 4–6 frets.

**Use cases**
- Open chords
- Barre chords
- Shell voicings

---

### 2. Fretboard Diagram (Horizontal Neck)

Represents a section of the fretboard across all six strings.

**Use cases**
- Scales
- Arpeggios
- Chord tone visualization

---

## Canonical Coordinate Model

### Strings

- 6 strings, numbered **1–6**
- String 1 = high E (rightmost)
- String 6 = low E (leftmost)

### Frets

- Integer fret numbers
- Diagram defines a **fret window**

---

## Shared Data Contract (Core)

```ts
interface NoteMarker {
  string: number   // 1–6
  fret: number     // absolute fret number
  finger?: number  // 1–4
  role?: 'root' | 'third' | 'fifth' | 'seventh' | 'extension'
}
```

---

## Chord Diagram Contract

**UPDATED**: See [schemas.md](./schemas.md#chord-diagram-schema) for the canonical JSON schema.

**Implementation Summary**:
- Uses `frets: Array<number | null>` (simple array, 0-5 indexed internally)
- Optional `finger_numbers` array for pedagogical hints
- Optional `note_roles` array for coloring by musical function
- `base_fret` auto-inferred if not provided

**Design Rationale**: The implementation uses a simpler `frets` array approach rather than `NoteMarker[]` to make AI generation easier and more reliable. Pedagogical metadata (finger numbers, note roles) is added as optional parallel arrays.

---

## Fretboard Diagram Contract

**UPDATED**: See [schemas.md](./schemas.md#fretboard-diagram-schema) for the canonical JSON schema.

**Implementation Summary**:
- Uses `fret_range: [start, end]` tuple (simpler than separate fields)
- `markers` array contains individual notes with string (1-6), fret (0-24), and optional label/role
- String numbering in markers is user-facing (1-6) not internal (0-5)

---

## Rendering Pipeline

```
AI Agent → DiagramSpec JSON
        → Schema Validation
        → Layout Engine
        → SVG Renderer
        → UI Component
```

AI never sees pixels or coordinates.

---

## Layout Engine (Deterministic)

### Dimensions

- Chord diagram: ~120×160 px
- Fretboard diagram: width flexible, height fixed

### Position Calculation

```ts
x = stringIndex * stringSpacing
y = fretIndex * fretSpacing
```

All spacing values are constants.

---

## Visual Language

### Notes
- Circle markers
- Root note: filled black
- Other notes: white fill, black stroke

### Fingers (Optional)
- Finger number inside note circle

### Strings
- Vertical lines (chord)
- Horizontal lines (fretboard)

### Frets
- Thick line for nut (fret 0)
- Thin lines for frets

---

## Example: Chord Diagram JSON

```json
{
  "type": "chord",
  "label": "Dm7",
  "startFret": 5,
  "fretsVisible": 4,
  "strings": [6,5,4,3,2,1],
  "notes": [
    { "string": 5, "fret": 5, "finger": 1, "role": "root" },
    { "string": 3, "fret": 5, "finger": 3, "role": "seventh" }
  ]
}
```

---

## Example: Fretboard Diagram JSON

```json
{
  "type": "fretboard",
  "label": "C Major Scale",
  "startFret": 3,
  "endFret": 7,
  "notes": [
    { "string": 6, "fret": 3, "role": "root" },
    { "string": 5, "fret": 5 }
  ]
}
```

---

## React Component Structure

```
/components/diagrams
  ChordDiagram.tsx
  FretboardDiagram.tsx
  DiagramFrame.tsx
```

- `DiagramFrame` handles labels & sizing
- Child components only render geometry

---

## Error Handling

- Invalid note positions → diagram rejected
- Out-of-range frets → schema error
- Missing required fields → hard fail

No silent corrections.

---

## Testing Strategy

- Snapshot tests for SVG output
- Golden JSON fixtures
- Visual regression tests (optional)

---

## Future Extensions

- Animated note highlighting
- Interval color themes
- Left-handed support (mirror rendering)
- Scale degree overlays

---

## Summary

This diagram system ensures:
- Visual correctness
- Consistency across lessons
- AI safety through strict contracts
- A strong foundation for advanced guitar visualization

It deliberately separates *musical intent* from *visual execution*, allowing AI to be powerful without being dangerous.


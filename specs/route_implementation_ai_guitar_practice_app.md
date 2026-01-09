# Route Implementation – AI Guitar Practice App

**Last Updated**: 2026-01-08

This document describes the Next.js App Router–based route architecture for the multi-agent AI system described in the PRD and Implementation Plan.

The focus is on clarity, debuggability, and incremental adoption of AI complexity.

**Note**: This document reflects the actual implemented routes. For canonical data schemas, see [schemas.md](./schemas.md).

---

## Design Goals

- Keep AI logic server-side
- Centralize orchestration in a single route
- Make individual agent calls composable and testable
- Support future parallel execution
- Avoid coupling UI directly to AI providers

---

## High-Level Architecture

```
Client (UI)
  ↓
Server Route (Orchestrator)
  ↓
Agent Dispatcher
  ↓
Specialized Agents (theory, planner, diagrams)
  ↓
Structured JSON Response
  ↓
Client Rendering (Lesson + Diagrams)
```

---

## Core Routes

### 1. Lesson Generation Route (Primary)

**Route**: `POST /api/lesson`

**Implementation**: `apps/web/src/app/api/lesson/route.ts`

**Responsibilities**:
- Entry point for lesson requests
- Invokes multi-agent orchestrator (`generateLessonViaOrchestrator`)
- Coordinates: research → orchestrator → theory → planner → generator → critic → enrichment
- Returns fully structured lesson object (PlanV1/LessonV1 schema)
- Stores generated artifacts in knowledge base (best-effort)

**Authentication**: Required (Supabase auth)

**Multi-Agent Pipeline**:
1. Research Agent: Determines web search queries
2. Orchestrator Agent: Routes request and creates high-level plan
3. Guitar Theory Agent: Identifies chords, voicings, progressions
4. Lesson Planner Agent: Creates lesson structure per block
5. Lesson Generator: Creates detailed step-by-step content
6. Quality Assessment: Validates pedagogical standards
7. Lesson Critic: One-shot validation with fix instructions
8. Diagram Enrichment: Adds deterministic diagram specifications

**Implementation File**: `apps/web/src/lib/ai/dispatcher.ts`

---

### 2. Q&A Route (Optional, v1+)

**Route**
```
POST /api/question
```

**Responsibility**
- Answer conceptual guitar questions
- Uses retrieval + theory agent
- Returns explanation + optional diagrams

---

### 3. Chord Diagram Rendering Route

**Route**: `POST /api/diagram/chord`

**Implementation**: `apps/web/src/app/api/diagram/chord/route.ts`

**Responsibilities**:
- Renders chord diagram specifications to SVG
- Caches rendered SVGs in database by spec hash
- Validates chord specs before rendering

**Authentication**: Required

**Request**:
```json
{
  "type": "chord",
  "style": "jazz-clean-v1",
  "title": "Dm7 (x5x56x)",
  "tuning": ["E2", "A2", "D3", "G3", "B3", "E4"],
  "frets": [null, 5, null, 5, 6, null],
  "root_strings": [1],
  "finger_numbers": [null, 1, null, 2, 3, null]
}
```

**Response**:
```json
{
  "ok": true,
  "hash": "a3f2b1...",
  "svg": "<?xml version=\"1.0\"...>",
  "cached": false
}
```

---

### 4. Fretboard Diagram Rendering Route

**Route**: `POST /api/diagram/fretboard`

**Implementation**: `apps/web/src/app/api/diagram/fretboard/route.ts`

**Responsibilities**:
- Renders fretboard diagram specifications to SVG
- Caches rendered SVGs in database by spec hash
- Validates fretboard specs before rendering

**Authentication**: Required

**Request**:
```json
{
  "type": "fretboard",
  "style": "jazz-clean-v1",
  "title": "C Major Scale (Open Position)",
  "tuning": ["E2", "A2", "D3", "G3", "B3", "E4"],
  "fret_range": [0, 5],
  "markers": [
    { "string": 6, "fret": 3, "label": "C", "role": "root" },
    { "string": 5, "fret": 3, "label": "C", "role": "root" }
  ],
  "show_fret_numbers": true,
  "color_by_role": true
}
```

**Response**:
```json
{
  "ok": true,
  "hash": "b4c3d2...",
  "svg": "<?xml version=\"1.0\"...>",
  "cached": false
}
```

---

### 5. Plan Generation Route

**Route**: `POST /api/plan/generate`

**Implementation**: `apps/web/src/app/api/plan/generate/route.ts`

**Responsibilities**:
- Generates and persists a daily practice plan
- Can be track-based or ad-hoc (no track)
- Supports two modes: "replace" (overwrites existing plan) or "next" (increments sequence)

**Authentication**: Required

**Request**:
```json
{
  "date": "2026-01-08",
  "focus_prompt": "Beginner jazz guitar: shell voicings + ii–V–I",
  "plan_track_id": "uuid-string-or-null",
  "title": "Daily Jazz Practice",
  "mode": "replace"
}
```

**Fields**:
- `date` (optional): Target date in YYYY-MM-DD format (defaults to today)
- `focus_prompt` (optional): User's lesson focus (defaults based on track)
- `plan_track_id` (optional): UUID of learning track, or null for ad-hoc
- `title` (optional): Plan title
- `mode` (optional): "replace" or "next" (defaults to "replace")

**Response**:
```json
{
  "ok": true,
  "plan_id": "uuid",
  "plan_track_id": "uuid-or-null",
  "mode": "replace",
  "date": "2026-01-08",
  "plan": {
    "version": "1.0",
    "date": "2026-01-08",
    "title": "Daily Jazz Practice",
    "focus_prompt": "Beginner jazz guitar: shell voicings + ii–V–I",
    "today_blocks": [...]
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "Error message",
  "plan_track_id": "uuid-or-null",
  "date": "2026-01-08"
}
```

---

### 6. Plan Save Route

**Route**: `POST /api/plan/save`

**Implementation**: `apps/web/src/app/api/plan/save/route.ts`

**Responsibilities**:
- Saves a generated lesson to Today as an ad-hoc plan
- Forces plan to be for today's date
- Always sets `plan_track_id = null` (ad-hoc)

**Authentication**: Required

**Request**:
```json
{
  "plan": {
    "version": "1.0",
    "date": "2026-01-08",
    "title": "Jazz ii–V–I Practice",
    "focus_prompt": "Practice shell voicings",
    "today_blocks": [...]
  }
}
```

**Response**:
```json
{
  "ok": true,
  "plan_id": "uuid"
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "Missing plan"
}
```

---

### 7. Knowledge Base: Ingest URL Route

**Route**: `POST /api/library/ingest-url`

**Implementation**: `apps/web/src/app/api/library/ingest-url/route.ts`

**Responsibilities**:
- Ingests web page content into knowledge base
- Optionally includes images from the page
- Generates embeddings for retrieval

**Authentication**: Required

**Request**:
```json
{
  "url": "https://example.com/jazz-theory",
  "title": "Jazz Theory Basics",
  "include_images": true
}
```

**Fields**:
- `url` (required): URL to ingest
- `title` (optional): Override title (defaults to page title)
- `include_images` (optional): Whether to include images (defaults to true)

**Response**:
```json
{
  "ok": true,
  "document_id": "uuid",
  "chunks_created": 15,
  "images_included": 3
}
```

---

### 8. Knowledge Base: Ingest PDF Route

**Route**: `POST /api/library/ingest-pdf`

**Implementation**: `apps/web/src/app/api/library/ingest-pdf/route.ts`

**Responsibilities**:
- Ingests PDF document into knowledge base
- Extracts text and generates embeddings
- Enforces 10MB file size limit

**Authentication**: Required

**Request**: `multipart/form-data`
- `title` (required): Document title
- `file` (required): PDF file (max 10MB)

**Response**:
```json
{
  "ok": true,
  "document_id": "uuid",
  "chunks_created": 42,
  "pages_processed": 12
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "PDF too large (max 10MB)"
}
```

---

### 9. Knowledge Base: Ingest YouTube Route

**Route**: `POST /api/library/ingest-youtube`

**Implementation**: `apps/web/src/app/api/library/ingest-youtube/route.ts`

**Responsibilities**:
- Ingests YouTube video transcript into knowledge base
- Falls back to metadata if no transcript available
- Generates embeddings for retrieval

**Authentication**: Required

**Request**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "title": "Jazz Guitar Lesson",
  "lang": "en",
  "allow_metadata_fallback": true
}
```

**Fields**:
- `url` (required): YouTube video URL
- `title` (optional): Override title (defaults to video title)
- `lang` (optional): Transcript language code (defaults to "en")
- `allow_metadata_fallback` (optional): Fall back to metadata if no transcript (defaults to true)

**Response**:
```json
{
  "ok": true,
  "document_id": "uuid",
  "chunks_created": 28,
  "mode": "transcript"
}
```

**Warning Response** (metadata fallback):
```json
{
  "ok": true,
  "document_id": "uuid",
  "chunks_created": 1,
  "mode": "metadata",
  "warning": "No transcript available; ingested metadata only."
}
```

**Error Response** (422 for user-actionable errors):
```json
{
  "ok": false,
  "error": "No transcript available for this video",
  "suggestion": "If this video has no transcript, paste the transcript text into 'Add a text document' as a fallback."
}
```

---

### 10. Ad-Hoc Lesson Wizard Route

**Route**: `POST /api/adhoc/wizard`

**Implementation**: `apps/web/src/app/api/adhoc/wizard/route.ts`

**Responsibilities**:
- Generates a quick ad-hoc lesson plan from a natural language prompt
- Creates plan with all four blocks (warmup, review, new, apply)
- Adjusts timing to match requested minutes
- Persists plan and request to database

**Authentication**: Required

**Request**:
```json
{
  "prompt": "I want to work on barre chords today",
  "minutes": 30
}
```

**Fields**:
- `prompt` (required): Natural language lesson request
- `minutes` (optional): Target duration in minutes (defaults to 30)

**Response**:
```json
{
  "ok": true,
  "plan_id": "uuid"
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "Missing prompt"
}
```

**Implementation Details**:
- Uses `runAdHocLessonPlan()` to generate lesson structure
- Ensures all four blocks are present (warmup, review, new, apply)
- Adjusts minutes to match requested duration
- Creates plan with `plan_track_id = null` (ad-hoc)
- Stores request in `ad_hoc_requests` table for tracking

---

### 11. Learning Track Wizard Route

**Route**: `POST /api/tracks/wizard`

**Implementation**: `apps/web/src/app/api/tracks/wizard/route.ts`

**Responsibilities**:
- Creates a complete learning track from user goals
- Generates 14-day learning path curriculum
- Creates track exercises across multiple phases
- Persists track, curriculum, and exercises to database

**Authentication**: Required

**Request**:
```json
{
  "title": "Jazz Guitar Fundamentals",
  "kind": "program",
  "goal": "Learn jazz chord voicings and basic comping patterns",
  "minutesPerDay": 30
}
```

**Fields**:
- `title` (required): Track title
- `kind` (optional): Track type - "program", "song", "technique", or "other" (defaults to "program")
- `goal` (required): Learning goal description
- `minutesPerDay` (optional): Daily practice target in minutes (defaults to 30)

**Response**:
```json
{
  "ok": true,
  "plan_track_id": "uuid",
  "exercise_count": 24,
  "phase_count": 4,
  "learning_path_days": 14
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "Track generator returned too few exercises. Please try again."
}
```

**Implementation Details**:
- Uses `runTrackWizard()` to generate track structure
- Uses `generateLearningPath14d()` to create evidence-backed 14-day curriculum
- Stores curriculum with both phase-based and learning path structures
- Generates exercise slugs from exercise names
- Tags exercises with phase information
- All exercises start as active (`is_active: true`)

---

## Request / Response Contracts

### Lesson Request Payload (Actual Implementation)

```json
{
  "prompt": "Help me practice jazz ii–V–I shell voicings",
  "date": "2026-01-08"
}
```

**Fields**:
- `prompt` (required): User's natural language lesson request
- `date` (optional): Target date in YYYY-MM-DD format (defaults to today)

---

### Lesson Response Payload (Actual Implementation)

```json
{
  "ok": true,
  "lesson": {
    "version": "1.0",
    "date": "2026-01-08",
    "title": "Jazz ii–V–I Shell Voicings Practice",
    "focus_prompt": "Help me practice jazz ii–V–I shell voicings",
    "assumptions": {
      "level": "beginner",
      "daily_minutes_target": 30,
      "instrument": "right-handed 6-string guitar",
      "tuning": "EADGBE"
    },
    "today_blocks": [
      {
        "block": "warmup",
        "minutes": 5,
        "items": [
          {
            "exercise_slug": "warmup-chromatic-scale",
            "name": "Chromatic Scale Warmup",
            "minutes": 5,
            "instructions_md": "Play chromatic scale across all strings...",
            "diagram_specs": []
          }
        ]
      },
      {
        "block": "review",
        "minutes": 5,
        "items": []
      },
      {
        "block": "new",
        "minutes": 15,
        "items": [
          {
            "exercise_slug": "shell-voicings-dm7-g7",
            "name": "Dm7 and G7 Shell Voicings",
            "minutes": 15,
            "instructions_md": "Learn the 3-7 shell voicings...",
            "diagram_specs": [
              {
                "type": "chord",
                "style": "jazz-clean-v1",
                "title": "Dm7 (x5x56x)",
                "tuning": ["E2", "A2", "D3", "G3", "B3", "E4"],
                "frets": [null, 5, null, 5, 6, null],
                "root_strings": [1]
              }
            ],
            "concept_tags": ["shell-voicings", "ii-V-I", "jazz"],
            "success_criteria": ["Can play Dm7 and G7 shell voicings smoothly"]
          }
        ]
      },
      {
        "block": "apply",
        "minutes": 5,
        "items": []
      }
    ],
    "sources": [
      {"type": "orchestrator_v1", "goal": "..."},
      {"type": "guitar_theory_v1", "chords": ["Dm7", "G7", "Cmaj7"]},
      {"type": "lesson_planner_v1"}
    ]
  },
  "meta": {
    "prompt": "Help me practice jazz ii–V–I shell voicings"
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "Missing prompt"
}
```

---

## Orchestrator Flow (Server-Side)

### Step-by-Step

1. Validate incoming request
2. Retrieve relevant embeddings (if enabled)
3. Call orchestrator agent
4. For each declared task:
   - Dispatch to appropriate agent
5. Merge structured outputs
6. Validate final lesson schema
7. Return response

---

## Suggested File Structure

```
/app
  /api
    /lesson
      route.ts
    /question
      route.ts
/lib
  /ai
    orchestrator.ts
    dispatcher.ts
    agents/
      orchestrator.agent.ts
      guitarTheory.agent.ts
      lessonPlanner.agent.ts
      diagram.agent.ts
  /schemas
    lesson.schema.ts
    diagram.schema.ts
```

---

## Example: `/api/lesson/route.ts`

```ts
import { orchestrateLesson } from '@/lib/ai/orchestrator'
import { validateLesson } from '@/lib/schemas/lesson.schema'

export async function POST(req: Request) {
  const body = await req.json()

  const lesson = await orchestrateLesson(body)

  validateLesson(lesson)

  return Response.json({ lesson })
}
```

---

## Agent Dispatcher Pattern

```ts
export async function dispatch(task: string, input: any) {
  switch (task) {
    case 'guitar-theory':
      return runGuitarTheoryAgent(input)
    case 'lesson-planner':
      return runLessonPlannerAgent(input)
    case 'diagram':
      return runDiagramAgent(input)
    default:
      throw new Error(`Unknown task: ${task}`)
  }
}
```

---

## Error Handling Strategy

- Schema validation errors → 400
- AI execution errors → 500
- Partial agent failure → fail fast (v1)

Future enhancement:
- Graceful degradation per section

---

## Logging & Observability

Log at each stage:
- Incoming request
- Orchestrator plan
- Agent outputs
- Final lesson

This is critical for prompt iteration in Cursor.

---

## Security Considerations

- All AI calls server-side
- No API keys exposed to client
- Input sanitization before AI calls

---

## Performance Notes

- Sequential execution in v1
- Parallelize independent agents later
- Cache embeddings aggressively

---

## Summary

This routing design keeps AI complexity off the client, centralizes orchestration, and gives you a clean path from a simple lesson generator to a sophisticated multi-agent system without changing your public API.


# Guitar Practice App - Version 1 Specification

A comprehensive reference document capturing all functionality of V1 before starting V2 development.

---

## Overview

**Type:** Next.js 16.1 full-stack web application (App Router)
**Purpose:** AI-powered guitar practice companion with personalized lesson generation, progress tracking, and knowledge base management
**Target User:** Beginner-intermediate jazz guitarists who prefer visual learning (chord diagrams, tabs, fretboard diagrams over standard notation)
**Architecture:** Multi-agent AI system with structured data pipelines and semantic knowledge retrieval

---

## Core Features

### 1. Lesson Generation & Practice

- **Daily Practice Plans**: AI generates time-boxed lessons (30+ minutes) with 4 fixed sections: Warmup → Review → New Content → Apply
- **Quick Practice**: One-off lessons on specific topics with chat support
- **Learning Paths**: Multi-day structured curricula that break complex topics into phases and daily lessons
- **Ad-hoc Lessons**: Create lessons without committing to a full path

### 2. Learning Paths System

- User proposes learning goal (e.g., "Master shell voicings")
- AI plans 7-21 day curriculum with phases and daily focuses
- User approves plan before lessons are generated
- AI generates one lesson per day with automatic adaptation
- Status tracking: `draft` → `approved` → `in_progress` → `completed`/`paused`

### 3. Knowledge Management (Library)

- **Sources**: URLs (with optional image extraction), YouTube transcripts, PDFs, plain text
- **Storage**: Semantic chunks with pgvector embeddings
- **Vision OCR**: Extract text from images in web pages
- **Search**: Semantic similarity search over stored chunks

### 4. Progress Tracking

- **Exercise Logging**: Track completion, time spent, notes, and difficulty
- **Follow-ups**: Flag exercises/concepts for deeper learning (open/snoozed/done)
- **Practice Sessions**: Group exercises by date with reflection notes
- **Difficulty Feedback**: Mark exercises as too easy/just right/too hard

### 5. Account & Customization

- **Auth**: Email/magic link authentication via Supabase
- **Theme**: Light/dark/system appearance settings

---

## Application Routes

| Route | Purpose |
|-------|---------|
| `/` | Entry redirect to `/login` or `/today` |
| `/login` | Magic link email authentication |
| `/auth/callback` | OAuth callback handler |
| `/auth/signout` | Sign out handler |
| `/today` | V1: Today's exercises from daily plans |
| `/today-v2` | V2: Learning paths + quick practice |
| `/learning-paths` | View/create/manage learning paths |
| `/history` | Completed lessons and saved quick practice |
| `/library` | Knowledge base ingestion and search |
| `/followups` | Manage flagged exercises |
| `/practice` | Original quick practice (deprecated) |
| `/plans` | Legacy track/plan management |
| `/settings` | Theme and account settings |

---

## UI Components

### Core Components

| Component | Purpose |
|-----------|---------|
| `ExerciseCard` | Exercise display with completion tracking, auto-generated chord diagrams |
| `ChordDiagram` | Renders chord diagram SVG from spec |
| `FretboardDiagram` | Renders fretboard diagram with note markers |
| `ReflectionForm` | Session-level feedback (confidence, notes) |
| `LessonViewV2` | Enhanced lesson viewer with blocks, exercises, chat |
| `LessonChat` | Chat interface for lesson Q&A |
| `IngestPanel` | Multi-format document ingestion UI |
| `ThemeProvider` | Theme context (light/dark/system) |

### Diagram Rendering

**Chord Diagram (Jazz-Clean-V1 Style)**
- 220px × 240px SVG
- Vertical box with 6 strings
- Nut at top (thick line if open position)
- Red filled = root notes, white = non-root
- Optional finger numbers inside dots

**Fretboard Diagram**
- Horizontal neck view
- Configurable fret range
- Markers with labels and roles (color-coded)

**Tablature**
- Measures with beats
- Note numbers on 6 strings
- Duration indicators and chord symbols

---

## API Endpoints

### Diagram APIs
```
POST /api/diagram/chord      → Generate/cache chord diagram SVG
POST /api/diagram/fretboard  → Generate/cache fretboard diagram SVG
```

### Lesson APIs
```
POST /api/lesson                    → Generate quick lesson
POST /api/lessons/{id}/chat         → Chat about lesson
POST /api/lessons/{id}/chat/threads → Manage chat threads
```

### Plan/Track APIs (V1)
```
POST /api/plan/generate             → Generate daily plan
POST /api/plan/save                 → Save plan
POST /api/tracks/wizard             → Create learning track
```

### Learning Path APIs (V2)
```
POST /api/paths                     → Create learning path
GET  /api/paths/{id}                → Get path details
POST /api/paths/{id}/lesson         → Generate next lesson
POST /api/paths/{id}/complete-day   → Mark day complete
POST /api/paths/{id}/approve        → Approve learning plan
```

### Quick Practice APIs (V2)
```
POST /api/quick-practice            → Generate quick practice lesson
POST /api/quick-practice/{id}/save  → Save to history
GET  /api/quick-practice/{id}       → Get lesson
```

### Knowledge Base APIs
```
POST /api/library/ingest-url        → Ingest website with images
POST /api/library/ingest-youtube    → Ingest YouTube transcript
POST /api/library/ingest-pdf        → Ingest PDF document
```

---

## Data Models

### V1 Plan Schema

```typescript
PlanV1 {
  version: "1.0"
  date: string
  title: string
  focus_prompt: string
  assumptions?: {
    level: "beginner"
    daily_minutes_target: number
    instrument: string
    tuning: string
  }
  today_blocks: PlanTodayBlock[]
  review_logic?: {
    include_open_followups: boolean
    prefer_recent_days: number
  }
  sources?: unknown[]
}

PlanTodayBlock {
  block: "warmup" | "review" | "new" | "apply"
  minutes: number
  items: PlanExerciseItem[]
}

PlanExerciseItem {
  exercise_slug: string
  name: string
  minutes: number
  instructions_md?: string
  tab_text?: string
  diagram_specs?: unknown[]
  concept_tags?: string[]
  common_mistakes?: string[]
  success_criteria?: string[]
}
```

### V2 Learning Path Schema

```typescript
LearningPath {
  id: uuid
  user_id: uuid
  title: string
  description: string
  goal: string
  plan: LearningPlan | null
  plan_status: "draft" | "approved" | "in_progress" | "completed" | "paused"
  current_phase: number
  current_day: number
  total_days: number | null
  adaptation_history: AdaptationEvent[]
}

LearningPlan {
  phases: LearningPhase[]
  estimated_days: number
  user_notes?: string
  approved_at?: string
}
```

### V2 Lesson Content Schema

```typescript
LessonV2Content {
  version: "2.0"
  id: uuid
  learning_path_id: uuid | null
  day_number: number | null
  date: string
  title: string
  objective: string
  prerequisites: string[]
  blocks: LessonBlock[]
  key_takeaways: string[]
  next_preview?: string
  difficulty_rating?: 1-5
  estimated_minutes: number
}

LessonBlock {
  id: string
  type: "warmup" | "concept" | "practice" | "apply" | "review"
  title: string
  minutes: number
  sections: ContentSection[]
  exercises: Exercise[]
}

Exercise {
  id: string
  name: string
  instructions_md: string
  minutes: number
  diagrams: DiagramSpec[]
  tablature?: DiagramSpec
  success_criteria: string[]
  common_mistakes: string[]
  completed?: boolean
  user_notes?: string
  difficulty_feedback?: "too_easy" | "just_right" | "too_hard"
  flagged_for_followup?: boolean
}
```

### Diagram Specifications

```typescript
ChordDiagramSpec {
  type: "chord"
  style?: "jazz-clean-v1"
  title?: string
  tuning?: string[]
  frets: (number | null)[]  // 6 values for 6 strings
  base_fret?: number
  root_strings?: number[]
  finger_numbers?: (number | null)[]
  note_roles?: (string | null)[]
}

FretboardDiagramSpec {
  type: "fretboard"
  style?: "jazz-clean-v1"
  title?: string
  tuning?: string[]
  fret_range: [number, number]
  markers: {
    string: number
    fret: number
    label?: string
    role?: string
  }[]
}

TablatureSpec {
  type: "tablature"
  title?: string
  tempo?: number
  time_signature?: string
  measures: Measure[]
  chord_symbols?: ChordSymbol[]
}
```

---

## Database Schema

### Core Tables

```sql
-- Daily practice plans
plans (
  id, user_id, plan_date, plan_json,
  title, focus_prompt, plan_track_id, sequence,
  created_at
)

-- Learning tracks
plan_tracks (
  id, user_id, title, created_at
)

-- Exercise completion tracking
exercise_logs (
  id, practice_session_id, plan_id, block, exercise_slug,
  completed, minutes, notes, flagged_for_followup,
  created_at
)

-- Session grouping
practice_sessions (
  id, user_id, session_date, created_at
)

-- Session feedback
practice_reflections (
  id, practice_session_id, plan_id,
  hard_notes, easy_notes, notes, confidence_json,
  created_at
)

-- Flagged exercises
follow_ups (
  id, user_id, title, status,
  source_plan_id, source_exercise_slug,
  snoozed_until, created_at
)
```

### V2 Tables

```sql
-- Multi-day curricula
learning_paths (
  id, user_id, title, description, goal,
  plan, plan_status,
  current_phase, current_day, total_days,
  adaptation_history,
  created_at, started_at, completed_at
)

-- Individual lessons
lessons (
  id, user_id,
  learning_path_id, day_number,
  is_quick_practice, prompt, saved,
  title, content,
  completed_at, feedback,
  created_at, updated_at
)

-- Lesson Q&A
chat_threads (
  id, lesson_id, title, is_active,
  created_at, archived_at
)

chat_messages (
  id, thread_id, role, content,
  diagrams, diagram_replacement,
  created_at
)
```

### Knowledge Base Tables

```sql
-- Source documents
knowledge_documents (
  id, user_id, title, source_type, source_url,
  raw_text, created_at
)

-- Semantic chunks with embeddings
knowledge_chunks (
  id, user_id, document_id, chunk_index,
  content, embedding,  -- pgvector
  created_at
)

-- Extracted images
knowledge_images (
  id, user_id, document_id,
  source_url, storage_path, content_type, bytes,
  alt_text, caption, ocr_text, vision_summary,
  created_at
)

-- Cached diagram renders
diagram_svgs (
  id, user_id, spec_hash, diagram_type, style,
  spec_json, svg,
  created_at
)
```

---

## AI System Architecture

### Multi-Agent Workflow

```
User Prompt
  ↓
Research Agent → Web queries
  ↓
[RAG] + [Topic Packs] + [Web Sources]
  ↓
Orchestrator → goal/tasks/constraints
  ↓
Guitar Theory Agent → theory context
  ↓
Learning Path Planner → curriculum structure
  ↓
Lesson Generator (per day) → full lesson content
  ↓
Chat Agent (on-demand) → answer questions
  ↓
Lesson Critic (optional) → QA validation
```

### AI Agents

| Agent | Responsibility |
|-------|----------------|
| Orchestrator | Parse prompt → goal/tasks/constraints |
| Learning Path Planner | Create multi-day curriculum with phases |
| Lesson Generator | Full lessons with blocks & exercises |
| Chat Agent | Answer questions about lessons |
| Guitar Theory Agent | Guitar theory expertise |
| Lesson Critic | Quality assurance |
| Research Agent | Knowledge gathering queries |

### Model Configuration

- **Default Model**: `claude-sonnet-4-20250514`
- **Orchestrator**: Temperature 0.1 (deterministic)
- **Learning Path Planner**: Temperature 0.3 (structured)
- **Lesson Generator**: Temperature 0.7 (engaging)

---

## Knowledge Base Pipeline

1. **Fetch**: URL → Extract readable content + images
2. **Chunk**: Text → Semantic chunks
3. **Embed**: Chunks → Vector embeddings
4. **Process Images**: Upload, OCR, vision summarization
5. **Store**: Chunks with embeddings in PostgreSQL/pgvector
6. **Search**: Semantic similarity queries

### Supported Sources

- **URLs**: Web pages with Readability extraction
- **YouTube**: Transcripts (fallback: title/description metadata)
- **PDFs**: Text extraction via pdf-parse
- **Plain Text**: Direct input

---

## External Integrations

### Anthropic Claude
- `/v1/messages` endpoint
- Text completion, JSON mode, streaming

### OpenAI (Fallback)
- `/v1/chat/completions` (JSON mode)
- `/v1/vision/completions` (OCR/image analysis)

### Supabase
- PostgreSQL database with pgvector
- Row-Level Security (RLS)
- Magic link authentication
- File storage for images

---

## Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY

# Optional
ANTHROPIC_MODEL          # Default: claude-sonnet-4-20250514
OPENAI_API_KEY           # Fallback for vision & planning
```

### Tech Stack

- **Framework**: Next.js 16.1 (App Router)
- **Database**: Supabase PostgreSQL + pgvector
- **Auth**: Supabase SSR magic link
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict mode)
- **AI**: Anthropic Claude (primary), OpenAI (fallback)

---

## Jazz Curriculum Focus

The app emphasizes jazz guitar education:
- Default prompts apply jazz-specific policies when detected
- "Beginner Jazz Guitar" default track creation
- Core concepts: shell voicings, ii–V–I progressions, comping, rhythm
- Chord diagrams auto-extracted from exercise text

---

## Feature Inventory

### Implemented
- [x] Magic link authentication
- [x] Daily practice plans (V1)
- [x] Learning paths with multi-day curricula (V2)
- [x] Quick practice lessons
- [x] Lesson chat interface
- [x] Chord/fretboard/tablature diagrams
- [x] Exercise completion tracking
- [x] Follow-up flagging
- [x] Practice reflections
- [x] Knowledge base ingestion (URL, YouTube, PDF, text)
- [x] Semantic search (RAG)
- [x] Image OCR/vision analysis
- [x] Theme switching (light/dark/system)
- [x] Diagram caching

### V1 Legacy Routes (Still Active)
- `/today` - Original daily exercises view
- `/followups` - Flagged exercises management
- `/plans` - Track wizard
- `/practice` - Ad-hoc practice (deprecated)

---

## Summary

Guitar Practice App V1 is an AI-driven learning platform that:

1. **Generates personalized lessons** via multi-agent orchestration
2. **Manages learning journeys** through plans (V1) and paths (V2)
3. **Visualizes guitar concepts** with deterministic, cached SVG diagrams
4. **Builds knowledge** through semantic ingestion and RAG retrieval
5. **Tracks progress** via logging and reflection
6. **Adapts dynamically** to user feedback
7. **Emphasizes jazz** as the core curriculum

The architecture prioritizes consistency (schemas, rendering), scalability (per-user RLS), and user autonomy (plan approval, optional follow-ups, ad-hoc lessons).

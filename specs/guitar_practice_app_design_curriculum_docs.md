# Product Requirements Document (PRD)

## Overview
A hosted web application for personal guitar practice, focused on **beginner jazz guitar**. The app generates daily practice plans, tracks lightweight progress, and builds a growing knowledge base from web and YouTube sources. It emphasizes **shell voicings, common jazz progressions, rhythm, and fretboard knowledge**, using chord symbols, tab, and consistent fretboard diagrams.

## Goals
- Generate daily 30+ minute practice plans from a prompt and user history
- Emphasize musical context (progressions) over isolated drills
- Track completion lightly (checkboxes, minutes, notes)
- Allow concepts to be flagged for deeper follow-up
- Grow a personal knowledge base from web pages and YouTube links
- Produce consistent fretboard diagrams and (later) animations

## Non-Goals (v1)
- Audio playback, metronome, or recording
- Payments or social features
- Advanced analytics

## Target User
- Beginner guitarist
- Interested in jazz rhythm, harmony, and fretboard knowledge
- Cannot read standard notation
- Uses standard tuning on a right-handed 6-string guitar

## Core UX
### Navigation
- Today
- Plans
- Follow-ups
- Library (Knowledge Base)
- Settings

### Today Page
- Four fixed blocks every day:
  1. Warmup
  2. Review
  3. New
  4. Apply
- Each exercise includes:
  - Checkbox
  - Default + editable minutes
  - Notes field
  - “Flag for follow-up” action
  - Tab and fretboard diagrams

### Follow-ups
- List of flagged concepts/exercises
- Status: Open / Snoozed / Done
- Can be injected into future plans

### Library
- Add content via URL, YouTube link, or pasted text
- Semantic search over stored knowledge

---

# Implementation Plan

## Tech Stack
- **Next.js (App Router)** – frontend + backend routes
- **Supabase** – hosted Postgres, Auth (magic link), pgvector, optional storage
- **LLM provider** – swappable (OpenAI, Anthropic, etc.)

## Milestones

### Milestone 1 – Project Skeleton
- Next.js project scaffold
- Supabase project + tables
- Magic-link email authentication
- Basic layout and navigation

### Milestone 2 – Daily Practice Tracking
- Today page rendering a daily plan
- Checkbox completion, minutes, notes
- Persist practice sessions and logs

### Milestone 3 – Follow-ups
- Create follow-up items from exercises
- Follow-ups page with status management
- Inject follow-ups into future plans

### Milestone 4 – Plan Generator
- API route to generate daily plan JSON
- Schema-locked LLM output
- Regenerate plan without deleting logs

### Milestone 5 – Diagram Renderer
- Deterministic SVG fretboard renderer
- Cache SVGs by spec hash
- Consistent visual style token (e.g., `jazz-clean-v1`)

### Milestone 6 – Knowledge Base + Retrieval
- Add documents via text or URL
- Chunk, embed, and store with pgvector
- Semantic search for plan generation

### Milestone 7 – YouTube Ingestion
- Attempt transcript extraction
- Chunk and embed transcripts
- Fallback to manual paste if unavailable

---

# Schemas

## Plan JSON Schema (v1.0)
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
      "block": "warmup | review | new | apply",
      "minutes": 0,
      "items": [
        {
          "exercise_slug": "string",
          "name": "string",
          "minutes": 0,
          "instructions_md": "string",
          "tab_text": "string",
          "diagram_specs": [],
          "concept_tags": [],
          "common_mistakes": [],
          "success_criteria": []
        }
      ]
    }
  ],
  "review_logic": {
    "include_open_followups": true,
    "prefer_recent_days": 7
  },
  "sources": []
}
```

## Diagram Spec (Fretboard)
```json
{
  "type": "fretboard",
  "style": "jazz-clean-v1",
  "title": "string",
  "tuning": ["E2","A2","D3","G3","B3","E4"],
  "fret_range": [0, 12],
  "markers": [
    {
      "string": 6,
      "fret": 3,
      "label": "C",
      "role": "root",
      "shape": "circle"
    }
  ],
  "show_fret_numbers": true,
  "color_by_role": true
}
```

---

# Cursor / Cline Prompt Pack

## Prompt 1 – Scaffold + Auth
> Create a Next.js App Router project with Supabase integration. Implement magic-link email authentication. Create SQL for tables needed for plans, practice tracking, follow-ups, and a knowledge base with pgvector. Include RLS so users only access their own data.

## Prompt 2 – Today Page
> Implement a Today page that loads or generates today’s plan. Render four blocks (warmup, review, new, apply). Each exercise card supports checkbox completion, minutes, notes, and a flag-for-follow-up action.

## Prompt 3 – Follow-ups
> Implement a Follow-ups page. Flagging an exercise creates a follow-up item. Allow marking follow-ups as done or snoozed and injecting them into future plans.

## Prompt 4 – Plan Generator
> Implement an API route that generates a daily practice plan in strict JSON following the provided schema. Always total at least 30 minutes and include all four blocks.

## Prompt 5 – SVG Diagram Renderer
> Build a deterministic SVG fretboard renderer for standard tuning, right-handed guitar. Use a single visual style token. Cache SVG output by hashing the diagram spec.

## Prompt 6 – Knowledge Base
> Implement document ingestion, chunking, embedding with pgvector, and semantic search. Expose a retrieval function for the plan generator.

## Prompt 7 – YouTube Ingestion
> Given a YouTube URL, attempt transcript extraction, chunk and embed the text, and store it as a knowledge document. Handle failure states gracefully.

---

# Suggested Jazz Lesson Plan (Curriculum)

## Guiding Principles
- Shell voicings before full chords
- Progressions before isolated shapes
- One new concept at a time
- Repetition and voice leading over variety

## Phase 1 – Foundations (Weeks 1–2)
- Shell voicings (R–3, R–7)
- ii–V–I in C and F
- Whole, half, and quarter-note rhythms
- Fretboard: natural notes on strings 6 and 5 (up to 7th fret)

## Phase 2 – Voice Leading (Weeks 3–5)
- Rootless shell voicings (3–7)
- ii–V–I in multiple keys
- I–vi–ii–V progressions
- Simple anticipations
- Fretboard: strings 6, 5, 4

## Phase 3 – Color & Fills (Weeks 6–8)
- Add 5ths or 9ths sparingly
- Minor ii–V–I
- Simple blues comping
- Single-note approach tones

## Phase 4 – Expansion (Later)
- Fuller voicings
- Drop-2 shapes
- Richer rhythmic vocabulary
- Tasteful fills and chord melody ideas

## Daily Structure
- Warmup (finger exercise)
- Review (recent material + follow-ups)
- New (one concept only)
- Apply (short comping task in context)

---

*All curriculum content assumes standard tuning, right-handed guitar, and no standard notation. Use chord symbols, tab, and fretboard diagrams exclusively.*


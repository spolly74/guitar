# Implementation Plan

## Tech Stack
- Next.js (App Router)
- Supabase (Auth via magic link, Postgres, pgvector)
- LLM provider (OpenAI / Anthropic, swappable)

## Milestones

### Milestone 1 – Project Skeleton
- Scaffold Next.js app
- Configure Supabase + environment variables
- Magic-link authentication
- Base layout and navigation

### Milestone 2 – Daily Practice Tracking
- Today page rendering daily plan
- Checkbox completion, minutes, notes
- Persist practice sessions and logs

### Milestone 3 – Follow-ups
- Flag exercises or concepts
- Follow-ups page (open / snoozed / done)
- Follow-ups injected into future plans

### Milestone 4 – Plan Generator
- API route to generate daily plan JSON
- Schema-locked output
- Regenerate plan without deleting logs

### Milestone 5 – Diagram Renderer
- Deterministic SVG fretboard renderer
- Standard tuning, right-handed only
- Cache SVGs by spec hash

### Milestone 6 – Knowledge Base
- Add documents via text or URL
- Chunk, embed, store with pgvector
- Semantic retrieval for generation

### Milestone 7 – YouTube Ingestion
- Attempt transcript extraction
- Chunk + embed transcript
- Manual fallback if unavailable


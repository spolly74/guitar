# Cursor / Cline Prompt Pack

## Scaffold + Auth
Create a Next.js App Router project with Supabase integration. Implement magic-link email authentication. Create SQL for plans, practice sessions, exercise logs, follow-ups, and knowledge base tables with pgvector. Add RLS so users only see their own data.

## Today Page
Implement the Today page rendering four blocks (warmup, review, new, apply). Each exercise card supports checkbox completion, minutes, notes, and a flag-for-follow-up action.

## Follow-ups
Implement Follow-ups page with open/snoozed/done states. Flagging an exercise creates a follow-up record referencing the plan and exercise.

## Plan Generator
Implement an API route that generates a daily practice plan in strict JSON following the Plan schema. Always generate at least 30 minutes total and include all four blocks.

## Diagram Renderer
Build a deterministic SVG fretboard renderer for standard tuning, right-handed guitar, using a single visual style token. Cache SVG output by hashing the diagram spec.

## Knowledge Base
Implement document ingestion, chunking, embedding with pgvector, and semantic search. Expose a retrieval function for the plan generator.

## YouTube Ingestion
Given a YouTube URL, attempt transcript extraction, chunk and embed the text, and store it as a knowledge document. Handle failure states gracefully.


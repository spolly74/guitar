# Implementation Plan – AI Guitar Practice App

This document outlines a phased, AI-aware implementation plan intended for use with Cursor. It emphasizes incremental delivery, strict schema enforcement, and clear separation of responsibilities between agents, tools, and UI.

---

## Guiding Principles

1. **Incremental AI Complexity**
   - Start with a single-agent system
   - Add orchestration and specialization only when needed

2. **Structured Outputs First**
   - Every AI response must conform to a schema
   - UI never renders raw AI prose

3. **Pedagogy over Novelty**
   - Consistency and clarity are higher priority than creativity

4. **Deterministic Rendering**
   - Diagrams are programmatically rendered, not hallucinated

---

## Phase 0 – Foundation (Non-AI)

### Goals
- Establish core app structure
- Define contracts that AI will later fulfill

### Tasks
- Set up Next.js App Router structure
- Define shared TypeScript types and schemas
- Create placeholder UI components for lessons and diagrams

### Key Files
```
/app
  /practice
    page.tsx
/lib
  schemas/
    lesson.schema.ts
    chord.schema.ts
    diagram.schema.ts
/components
  LessonView.tsx
  DiagramRenderer.tsx
```

---

## Phase 1 – Single-Agent Lesson Generation

### Goals
- Generate a basic lesson from a single AI prompt
- Validate schema-driven rendering

### AI Setup
- One “Lesson Generator” prompt
- Hard-coded constraints:
  - 30 minutes
  - Standard tuning
  - Right-handed

### Tasks
- Create a single API route for lesson generation
- Implement JSON schema validation on AI output
- Render lesson steps in UI

### Output Example
```json
{
  "title": "Intro to Shell Voicings",
  "duration": 30,
  "sections": [
    { "type": "warmup", "minutes": 5 },
    { "type": "exercise", "minutes": 15 },
    { "type": "application", "minutes": 10 }
  ]
}
```

---

## Phase 2 – Orchestrator Agent

### Goals
- Separate intent interpretation from content generation

### New Agent
**Orchestrator Agent**
- Reads user request
- Decides which agents/tools to invoke
- Produces a task plan

### Tasks
- Add orchestrator prompt
- Implement agent dispatcher utility
- Support sequential agent execution

### Example Orchestrator Output
```json
{
  "goal": "Practice ii–V–I comping",
  "tasks": [
    "explain concept",
    "generate chord voicings",
    "build practice routine"
  ]
}
```

---

## Phase 3 – Guitar Theory / Pedagogy Agent

### Goals
- Centralize musical knowledge
- Improve correctness and consistency

### Tasks
- Create guitar-theory prompt
- Return only musical data (no prose)
- Integrate with orchestrator

### Output Example
```json
{
  "chords": ["Dm7", "G7", "Cmaj7"],
  "voicings": {
    "Dm7": ["x5x56x"],
    "G7": ["3x343x"]
  }
}
```

---

## Phase 4 – Lesson Planner Agent

### Goals
- Convert musical data into time-boxed practice

### Tasks
- Create lesson-planner prompt
- Enforce time constraints
- Generate section-by-section instructions

### Output Example
```json
{
  "sections": [
    { "label": "Warmup", "minutes": 5, "focus": "Shell shapes" },
    { "label": "Exercise", "minutes": 15, "focus": "ii–V–I in 3 keys" }
  ]
}
```

---

## Phase 5 – Retrieval & Embeddings (RAG)

### Goals
- Ensure long-term consistency
- Reuse canonical explanations

### Tasks
- Store lessons and theory notes as embeddings
- Retrieve relevant context before agent calls
- Inject retrieved context into prompts

### Tech Options
- Supabase + pgvector
- Pinecone (optional later)

---

## Phase 6 – Diagram Instruction Generation

### Goals
- Separate diagram logic from rendering

### Tasks
- AI outputs diagram instructions only
- Define diagram instruction schema
- Pass instructions to renderer

### Output Example
```json
{
  "type": "chord",
  "root": "Dm7",
  "positions": [
    { "string": 5, "fret": 5 },
    { "string": 3, "fret": 5 }
  ]
}
```

---

## Phase 7 – Parallel Agent Execution (Optional)

### Goals
- Improve performance
- Prepare for future expansion

### Tasks
- Execute independent agents in parallel
- Merge results at orchestrator level

---

## Cursor-Specific Guidance

- Maintain one prompt file per agent
- Use comments to explain schema expectations
- Refactor prompts as first-class artifacts

Recommended structure:
```
/ai
  /agents
    orchestrator.prompt.md
    guitar-theory.prompt.md
    lesson-planner.prompt.md
```

---

## Exit Criteria for v1

- User can request a lesson via natural language
- Lesson is structured, time-boxed, and guitar-correct
- Diagrams render deterministically
- AI output is schema-valid without manual fixes

---

## Summary

This phased plan allows the app to evolve from a simple AI-assisted tool into a robust multi-agent learning system while minimizing risk, maintaining clarity, and supporting rapid iteration in Cursor.


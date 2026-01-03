# Route Implementation – AI Guitar Practice App

This document describes a suggested Next.js App Router–based route architecture for implementing the multi-agent AI system described in the PRD and Implementation Plan.

The focus is on clarity, debuggability, and incremental adoption of AI complexity.

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

**Route**
```
POST /api/lesson
```

**Responsibility**
- Entry point for lesson requests
- Invokes orchestrator agent
- Coordinates downstream agents
- Returns a fully structured lesson object

**Why a single route?**
- Keeps orchestration centralized
- Simplifies logging and debugging
- Prevents UI from managing agent complexity

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

### 3. Diagram Preview Route (Optional, dev-only)

**Route**
```
POST /api/diagram/preview
```

**Responsibility**
- Debug diagram instruction output
- Render SVG directly for inspection

---

## Request / Response Contracts

### Lesson Request Payload

```json
{
  "prompt": "Help me practice jazz ii–V–I shell voicings",
  "constraints": {
    "minutes": 30,
    "tuning": "standard",
    "handedness": "right",
    "instrument": "guitar"
  },
  "context": {
    "skillLevel": "intermediate",
    "path": "jazz"
  }
}
```

---

### Lesson Response Payload

```json
{
  "lesson": {
    "title": "Jazz ii–V–I Shell Voicings",
    "totalMinutes": 30,
    "sections": [
      {
        "label": "Warmup",
        "minutes": 5,
        "content": "Review shell voicing shapes"
      }
    ],
    "diagrams": []
  }
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


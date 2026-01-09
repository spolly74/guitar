# Product Requirements Document (PRD)

## Product Name
AI‑Powered Guitar Practice App (working title)

## Overview
This product is a web‑based guitar practice application built with Next.js that uses sophisticated AI capabilities to generate personalized guitar lessons, answer theory and technique questions, and produce high‑quality visual learning aids (chord diagrams and fretboard diagrams).

The app is designed for guitarists who:
- Practice at least 30 minutes per day
- Use a right‑handed, 6‑string guitar in standard tuning
- Do not read standard notation
- Prefer chord symbols, tablature, and visual fretboard representations

AI is used not as a novelty, but as a structured teaching system that adapts to the user’s goals, skill level, and practice constraints.

---

## Goals

### Primary Goals
- Generate structured, high‑quality guitar lessons on demand
- Answer guitar‑related questions accurately and consistently
- Provide visually consistent chord and fretboard diagrams
- Support long‑term skill development through progressive lesson planning

### Secondary Goals
- Maintain pedagogical consistency across lessons
- Allow future expansion into additional learning paths (e.g. blues, rock, advanced jazz)
- Enable AI‑aware development workflows using Cursor

---

## Non‑Goals (v1)
- Audio transcription or real‑time audio analysis
- MIDI or DAW integration
- Multi‑instrument support
- Social features or gamification

---

## Target User

**Profile**
- Adult guitarist (beginner → intermediate)
- Self‑directed learner
- Interested in structured practice and theory applied to the fretboard

**Constraints**
- Limited daily practice time
- No standard notation literacy
- Needs clear, repeatable visuals

---

## Core Features

### 1. AI Lesson Generation
- User can request lessons by:
  - Style (e.g. jazz, blues)
  - Concept (e.g. shell voicings, ii–V–I)
  - Time available
- Lessons are:
  - Time‑boxed
  - Step‑by‑step
  - Progressive

### 2. AI Q&A for Guitar Concepts
- User can ask natural language questions
- Responses are:
  - Guitar‑specific
  - Consistent with app pedagogy
  - Grounded in existing lesson material when possible

### 3. Diagram Generation
- Chord diagrams (box diagrams)
- Fretboard diagrams (horizontal neck view)
- Diagrams must be:
  - Visually consistent
  - Programmatically generated
  - Accurate and deterministic

### 4. Multi‑Agent AI Architecture
- Distinct AI agents with clear responsibilities:
  - Orchestrator
  - Guitar theory / pedagogy
  - Lesson planner
  - Diagram instruction generator
- Agents communicate via structured data only (JSON)

---

## AI System Requirements

### Orchestration
- One orchestrator agent decides which specialized agents to invoke
- No free‑form agent‑to‑agent conversation

### Structured Outputs
- All AI responses must conform to predefined schemas
- No raw prose sent directly to the UI

### Retrieval (RAG)
- Use embeddings to retrieve:
  - Prior lessons
  - Canonical theory explanations
- Ensures consistency over time

---

## UX Requirements

- Clear separation between:
  - Explanation
  - Exercise
  - Application
- Diagrams appear inline with explanations
- Mobile‑friendly but desktop‑first

---

## Technical Constraints

- Framework: Next.js (App Router)
- AI Development: Cursor (GPT‑5.2)
- Rendering: SVG / Canvas (no static images for diagrams)
- Hosting: Web‑hosted application

---

## Success Metrics

- User can generate a coherent 30‑minute lesson in < 3 seconds
- Lessons maintain consistent terminology and structure
- Diagrams render accurately across devices
- AI output requires minimal manual correction

---

## Risks & Mitigations

| Risk | Mitigation |
|----|----|
| Inconsistent AI responses | Use RAG + schemas |
| Incorrect diagrams | Programmatic rendering only |
| Over‑complex agent system | Incremental rollout |

---

## Future Considerations

- User progress tracking
- Adaptive difficulty
- Multiple learning paths
- Backing track integration

---

## Summary

This product aims to combine modern AI orchestration with strong pedagogical structure to create a reliable, scalable guitar learning system. The focus is on clarity, consistency, and long‑term skill development—not novelty.


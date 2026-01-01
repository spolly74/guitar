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


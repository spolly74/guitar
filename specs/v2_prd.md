# Guitar Practice App V2 - Product Requirements Document

**Version**: 2.0
**Date**: 2026-01-08
**Status**: Draft for Review

---

## Executive Summary

V2 reimagines the guitar practice app around **Learning Paths** - adaptive, multi-lesson journeys that break complex topics into manageable daily sessions. The app becomes a true AI tutor: it plans, teaches, shows, and answers questions.

---

## What's New in V2

| Feature | V1 | V2 |
|---------|----|----|
| Lesson structure | Single daily plan | **Learning Paths** + **Quick Practice** one-offs |
| Planning | AI generates, user accepts | AI proposes plan, **user approves before execution** |
| Chord visuals | Basic diagram | **Chord diagram with fret number indicator** |
| Scale/pattern visuals | Basic markers | **Full fretboard diagram with note labels** |
| Riff notation | Text description | **Tablature rendering** |
| Interactivity | Static lesson | **Chat interface for Q&A** |
| Adaptation | Manual follow-ups | **Automatic adaptation based on feedback** |
| One-off lessons | N/A | **Quick Practice** with full feature parity |

---

## Core Concepts

### Learning Path

A **Learning Path** is an iterative series of lessons that teaches a concept too broad for a single session.

**Examples:**
- "Learn the CAGED system"
- "Master shell voicings in all keys"
- "Understand the ii-V-I progression"
- "Learn to comp over Autumn Leaves"

**Lifecycle:**
1. User requests a Learning Path (topic + optional goals)
2. AI analyzes scope and breaks into phases/lessons
3. AI presents a **Learning Plan** for user approval
4. User approves, modifies, or rejects
5. AI generates Day 1 lesson
6. User practices, provides feedback
7. AI adapts subsequent lessons based on:
   - Completion status
   - Difficulty feedback
   - Questions asked
   - Follow-up flags
8. Repeat until path complete

### Learning Plan

The **Learning Plan** is a structured outline the AI creates before generating lessons.

```
Learning Path: "Master Shell Voicings"
├── Phase 1: Foundation (Days 1-3)
│   ├── Day 1: Major 7 shells on strings 6-5-4
│   ├── Day 2: Minor 7 shells on strings 6-5-4
│   └── Day 3: Dominant 7 shells on strings 6-5-4
├── Phase 2: Application (Days 4-6)
│   ├── Day 4: ii-V-I in C using shells
│   ├── Day 5: ii-V-I in F and G
│   └── Day 6: Voice leading between shapes
├── Phase 3: Expansion (Days 7-9)
│   ├── Day 7: Shells on strings 5-4-3
│   ├── Day 8: Mixing string sets
│   └── Day 9: Adding extensions
└── Phase 4: Mastery (Days 10-12)
    ├── Day 10: Comping over Autumn Leaves (A section)
    ├── Day 11: Comping over Autumn Leaves (full)
    └── Day 12: Review and free comping
```

**User must approve** this plan before any lessons are generated.

### Quick Practice (One-Off Lessons)

Not everything needs a multi-day commitment. **Quick Practice** lets users generate standalone lessons from a simple prompt.

**Examples:**
- "Show me how to play a jazz blues in F"
- "Teach me the minor pentatonic scale"
- "What are some easy bossa nova chords?"
- "Help me understand tritone substitution"

**Key Features:**
- Full lesson quality (same as Learning Path lessons)
- Chord diagrams with fret numbers
- Fretboard diagrams for scales/patterns
- Tablature for riffs
- **Chat interface** for follow-up questions
- Can be "promoted" to a Learning Path if user wants to go deeper

**Flow:**
1. User enters prompt
2. AI generates complete lesson immediately (no plan approval needed)
3. User practices with full chat support
4. Optional actions:
   - **Save** → Lesson saved to history for future reference
   - **Go Deeper** → Converts topic to a full Learning Path

**Use Cases:**
- Exploring a new concept before committing
- Quick refresher on something already learned
- Answering a specific question ("How do I play X?")
- Spontaneous practice session

**Saving Quick Practice Lessons:**
- By default, Quick Practice lessons are **not automatically saved**
- User can explicitly save with "Save to Library" button
- Saved lessons appear in History and can be revisited
- Unsaved lessons are available for the current session only

---

## Visual Language Requirements

### 1. Chord Diagrams (Vertical Box)

Every chord reference MUST include a visual diagram.

**Required Elements:**
- Vertical orientation (nut at top)
- 6 strings clearly visible
- **Fret number indicator** on left side (e.g., "5" for 5th fret position)
- Finger dots on fretted notes
- X for muted strings
- O for open strings
- Optional: finger numbers inside dots (1-4)
- Optional: note names or intervals below

**Visual Reference:**
```
    A       Am      A7
    x       x       x
 5──■■■──  5──■■■──  5──■■■──
   │ │ │     │ │ │     │ │ │
   │ ● │     │ ● │     │ ● │
   │   ●     │   │     │   │
```

The fret number (5 in this example) tells the player where to position their hand.

**When to use:** Single chord voicings, chord changes, shell voicings

---

### 2. Fretboard Diagrams (Horizontal Neck)

For scales, arpeggios, triads, and patterns that span multiple positions.

**Required Elements:**
- Horizontal orientation (low E at bottom, high E at top)
- Fret numbers along bottom
- **Note labels inside circles** (note names like "A", "C#", "F#")
- **Root notes highlighted** (red fill)
- Other notes in contrasting style (black fill with white text)
- Fret markers (dots) at 3, 5, 7, 9, 12

**Visual Reference (A Major Scale):**
```
e|──●F#──●G#────●A───────────●B───|
B|──────●C#────●D────●E──────────│
G|──●G#────●A───────●B─────●C#───|
D|────●E───────●F#──●G#────●A────|
A|──●B─────●C#──●D────●E─────────|
E|──────●F#──●G#────●A───────────|
    5    6    7    8    9   10
```

Root notes (A) shown in red, other scale tones in black.

**When to use:** Scales, modes, arpeggios, chord tones across the neck, triad shapes

---

### 3. Tablature

For specific riffs, licks, melodies, and note-by-note passages.

**Required Elements:**
- 6 horizontal lines (strings)
- String labels (e, B, G, D, A, E)
- Fret numbers on strings
- Timing indicators (optional: note values, bar lines)
- Technique annotations (h = hammer-on, p = pull-off, / = slide, b = bend)

**Example:**
```
   Jazz ii-V-I Lick in C

e|--------------------------------|
B|--------8--10--8----------------|
G|---7-9-----------9--7-----------|
D|-10------------------10--8--7---|
A|--------------------------------|
E|--------------------------------|
    Dm7      G7       Cmaj7
```

**When to use:** Melodic lines, riffs, licks, arpeggiated passages, specific note sequences

---

### 4. Choosing the Right Visual

| Content Type | Visual Format |
|--------------|---------------|
| Single chord voicing | Chord diagram |
| Chord progression (showing shapes) | Multiple chord diagrams |
| Scale pattern | Fretboard diagram |
| Arpeggio shape | Fretboard diagram |
| Triad inversions | Fretboard diagram |
| Melodic riff/lick | Tablature |
| Fingerpicking pattern | Tablature |
| Specific note sequence | Tablature |
| Rhythm pattern | Chord symbols + rhythm notation |

---

## Chat Interface

Each lesson includes an AI chat interface for real-time Q&A.

### Capabilities

The chat assistant can:

1. **Explain concepts** from the current lesson
   - "Why is this called a shell voicing?"
   - "What makes this a ii-V-I progression?"

2. **Show additional visuals**
   - "Show me this chord in a different position"
   - "What does the G mixolydian scale look like?"

3. **Provide alternatives**
   - "Is there an easier fingering for this?"
   - "What if I can't stretch that far?"

4. **Connect to theory**
   - "What notes are in this chord?"
   - "Why does V resolve to I?"

5. **Adjust difficulty**
   - "This is too hard, can we simplify?"
   - "I've got this, what's next?"

6. **Modify diagrams in the lesson**
   - "Show me a different voicing for this Dm7"
   - "Can I see this scale starting at the 7th fret instead?"
   - "I prefer the barre chord version"

   When the user requests an alternative diagram, the AI can:
   - Generate a new diagram and display it in the chat
   - Offer to **replace** the original diagram in the lesson
   - User confirms replacement, and the lesson updates in place

### Context Awareness

The chat has full context of:
- Current lesson content
- User's Learning Path and progress
- Previous lessons in this path
- User's skill level and preferences
- Practice history and feedback

### Chat History & Sessions

- **History persists** across sessions - returning to a lesson shows previous chat
- User can **start a new chat** to get a fresh conversation
- Chat threads are tied to the lesson, not the session
- Multiple chat threads per lesson are supported (archived threads viewable)

### UI Placement

- Chat panel slides in from right side
- Can be collapsed/expanded
- "New Chat" button to start fresh conversation
- Chat history dropdown to view/restore previous threads
- Key Q&A can be flagged to influence future lessons

---

## Lesson Structure (V2)

### Lesson JSON Schema

```typescript
interface LessonV2 {
  version: "2.0";

  // Metadata
  id: string;
  learning_path_id: string;
  day_number: number;
  date: string;

  // Content
  title: string;
  objective: string;           // What user will learn
  prerequisites: string[];     // What user should already know

  // Blocks (flexible, not fixed 4)
  blocks: LessonBlock[];

  // Summary
  key_takeaways: string[];
  next_preview: string;        // What's coming next

  // Adaptation
  difficulty_rating: 1 | 2 | 3 | 4 | 5;
  estimated_minutes: number;
  adaptation_notes?: string;   // Why this lesson was adjusted
}

interface LessonBlock {
  id: string;
  type: "warmup" | "concept" | "practice" | "apply" | "review";
  title: string;
  minutes: number;

  // Content sections
  sections: ContentSection[];

  // Exercises
  exercises: Exercise[];
}

interface ContentSection {
  type: "text" | "chord_diagram" | "fretboard_diagram" | "tablature" | "tip" | "warning";
  content: string | DiagramSpec | TablatureSpec;
}

interface Exercise {
  id: string;
  name: string;
  instructions_md: string;
  minutes: number;

  // Visuals (auto-rendered)
  diagrams: DiagramSpec[];
  tablature?: TablatureSpec;

  // Tracking
  success_criteria: string[];
  common_mistakes: string[];

  // User interaction
  completed?: boolean;
  user_notes?: string;
  difficulty_feedback?: "too_easy" | "just_right" | "too_hard";
  flagged_for_followup?: boolean;
}
```

---

## Diagram Schemas (V2)

### Chord Diagram Schema

```typescript
interface ChordDiagramSpec {
  type: "chord";
  style: "jazz-clean-v2";

  // Display
  title: string;              // e.g., "Dm7", "Cmaj7"
  subtitle?: string;          // e.g., "Shell voicing", "Drop 2"

  // Position indicator (REQUIRED in V2)
  base_fret: number;          // Fret number shown on diagram

  // Fingering
  tuning: ["E", "A", "D", "G", "B", "E"];
  frets: (number | null)[];   // 6 elements, null = muted, 0 = open
  fingers?: (number | null)[]; // 1-4 for finger numbers

  // Note information
  note_labels?: (string | null)[];    // Note names: ["D", null, "F", "C", null, null]
  interval_labels?: (string | null)[]; // Intervals: ["R", null, "b3", "b7", null, null]

  // Visual hints
  barre?: {
    fret: number;
    from_string: number;
    to_string: number;
  };

  // Pedagogical
  highlight_root?: boolean;   // Red fill for root notes
}
```

### Fretboard Diagram Schema

```typescript
interface FretboardDiagramSpec {
  type: "fretboard";
  style: "jazz-clean-v2";

  // Display
  title: string;              // e.g., "A Major Scale", "Dm7 Arpeggio"

  // Range
  fret_range: [number, number]; // e.g., [5, 9]

  // Notes
  markers: FretboardMarker[];

  // Options
  show_fret_numbers: boolean;
  show_fret_dots: boolean;    // Standard fret markers (3,5,7,9,12)
  highlight_roots: boolean;   // Red fill for root notes
}

interface FretboardMarker {
  string: number;             // 1-6 (1 = high E)
  fret: number;               // 0-24
  label: string;              // Note name: "A", "C#", etc.
  role: "root" | "third" | "fifth" | "seventh" | "second" | "fourth" | "sixth" | "extension";
}
```

### Tablature Schema

```typescript
interface TablatureSpec {
  type: "tablature";

  // Display
  title?: string;
  tempo?: number;             // BPM (optional)
  time_signature?: string;    // "4/4", "3/4", etc.

  // Content
  measures: TablatureMeasure[];

  // Annotations
  chord_symbols?: ChordAnnotation[];
}

interface TablatureMeasure {
  // Each string is an array of fret numbers or rests
  // Position in array = rhythmic position
  strings: {
    e: (number | string | null)[];  // high E
    B: (number | string | null)[];
    G: (number | string | null)[];
    D: (number | string | null)[];
    A: (number | string | null)[];
    E: (number | string | null)[];  // low E
  };

  // Technique annotations at positions
  techniques?: {
    position: number;
    type: "h" | "p" | "/" | "\\" | "b" | "r" | "~" | "x";
    // h=hammer, p=pull, /=slide up, \=slide down, b=bend, r=release, ~=vibrato, x=mute
  }[];
}

interface ChordAnnotation {
  position: number;           // Position in measure
  chord: string;              // "Dm7", "G7", etc.
}
```

---

## Learning Path Schema

```typescript
interface LearningPath {
  id: string;
  user_id: string;

  // Definition
  title: string;              // "Master Shell Voicings"
  description: string;
  goal: string;               // What user will achieve

  // Plan (approved by user)
  plan: LearningPlan;
  plan_status: "draft" | "approved" | "in_progress" | "completed" | "paused";

  // Progress
  current_phase: number;
  current_day: number;
  total_days: number;

  // Dates
  created_at: string;
  started_at?: string;
  completed_at?: string;

  // Adaptation
  adaptation_history: AdaptationEvent[];
}

interface LearningPlan {
  phases: LearningPhase[];
  estimated_days: number;

  // User modifications
  user_notes?: string;
  approved_at?: string;
}

interface LearningPhase {
  number: number;
  title: string;              // "Foundation"
  objective: string;
  days: LearningDay[];
}

interface LearningDay {
  day_number: number;
  title: string;              // "Major 7 shells on strings 6-5-4"
  focus: string;
  estimated_minutes: number;

  // Generated when day is reached
  lesson_id?: string;
  completed?: boolean;
  completion_date?: string;
}

interface AdaptationEvent {
  timestamp: string;
  trigger: "user_feedback" | "difficulty_flag" | "chat_request" | "completion_pattern";
  description: string;
  changes_made: string;
}
```

---

## User Flows

### Flow 1: Create Learning Path

```
User: "I want to learn shell voicings"
                    ↓
        ┌──────────────────────┐
        │   AI Analyzes Scope  │
        │   - Topic complexity │
        │   - User level       │
        │   - Prerequisites    │
        └──────────────────────┘
                    ↓
        ┌──────────────────────┐
        │  Present Learning    │
        │       Plan           │
        │                      │
        │  Phase 1: Days 1-3   │
        │  Phase 2: Days 4-6   │
        │  Phase 3: Days 7-9   │
        │  ...                 │
        └──────────────────────┘
                    ↓
        User reviews plan
                    ↓
    ┌───────────┴───────────┐
    │                       │
 Approve              Request Changes
    │                       │
    ↓                       ↓
Start Day 1          AI revises plan
                           ↓
                    Present revised
                           ↓
                    (loop until approved)
```

### Flow 2: Daily Practice with Chat

```
User opens Today
        ↓
┌─────────────────────────────────────────┐
│                                         │
│  Learning Path: Shell Voicings          │
│  Day 4 of 12 - Phase 2: Application     │
│                                         │
│  ┌─────────────────────┬─────────────┐  │
│  │                     │             │  │
│  │  Lesson Content     │   Chat      │  │
│  │                     │             │  │
│  │  [Chord Diagrams]   │  Q: Why is  │  │
│  │  [Instructions]     │  this a ii? │  │
│  │  [Exercises]        │             │  │
│  │                     │  A: In the  │  │
│  │  ☑ Exercise 1       │  key of C...│  │
│  │  ☐ Exercise 2       │             │  │
│  │  ☐ Exercise 3       │  [Ask...]   │  │
│  │                     │             │  │
│  └─────────────────────┴─────────────┘  │
│                                         │
│  [Complete Day] [Pause Path] [Skip Day] │
│                                         │
└─────────────────────────────────────────┘
```

### Flow 3: Quick Practice (One-Off Lesson)

```
User: "Teach me the minor pentatonic scale"
                    ↓
        ┌──────────────────────┐
        │   AI Generates       │
        │   Complete Lesson    │
        │   (no plan needed)   │
        └──────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│                                         │
│  Quick Practice: Minor Pentatonic       │
│                                         │
│  ┌─────────────────────┬─────────────┐  │
│  │                     │             │  │
│  │  [Fretboard Diagram]│   Chat      │  │
│  │  [Scale Pattern]    │             │  │
│  │  [Tab Examples]     │  Q: What    │  │
│  │                     │  songs use  │  │
│  │  ☐ Exercise 1       │  this?      │  │
│  │  ☐ Exercise 2       │             │  │
│  │                     │  A: Many!...│  │
│  └─────────────────────┴─────────────┘  │
│                                         │
│  [Done] [Save] [Go Deeper → Create Path]│
│                                         │
└─────────────────────────────────────────┘
                    ↓
        User clicks "Go Deeper"
                    ↓
        ┌──────────────────────┐
        │   AI Creates Full    │
        │   Learning Path      │
        │   Building on Topic  │
        └──────────────────────┘
                    ↓
        → Flow 1 (Plan Approval)
```

### Flow 4: Adaptation

```
User completes Day 4
        ↓
Feedback: "Too hard" + flagged exercise
        ↓
┌──────────────────────────────────────┐
│         AI Adaptation Engine         │
│                                      │
│  Inputs:                             │
│  - Difficulty: "too_hard"            │
│  - Flagged: "ii-V-I in G"            │
│  - Chat: Asked about finger stretch  │
│  - Time: Took 45 min (est: 30)       │
│                                      │
│  Decision:                           │
│  - Insert review day                 │
│  - Simplify Day 5 content            │
│  - Add easier voicing alternatives   │
│                                      │
└──────────────────────────────────────┘
        ↓
Day 5 generated with adaptations
        ↓
User notified: "Day 5 adjusted based on your feedback"
```

---

## Navigation (V2)

```
┌─────────────────────────────┐
│  Today                      │  ← Practice here (paths + quick practice)
├─────────────────────────────┤
│  Learning Paths             │  ← Manage multi-day curricula
├─────────────────────────────┤
│  History                    │  ← Past lessons (saved quick practice + completed path days)
├─────────────────────────────┤
│  Settings                   │  ← Preferences
└─────────────────────────────┘
```

**4 tabs total.**

**Today Page:**
- Shows current lesson from active Learning Path (if any)
- Always has a "Quick Practice" prompt/button to start a one-off lesson
- Quick Practice sessions appear here while active
- No separate Quick Practice page needed

---

## API Routes (V2)

### Learning Paths

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/paths` | GET | List user's learning paths |
| `/api/paths` | POST | Create new learning path |
| `/api/paths/[id]` | GET | Get path details |
| `/api/paths/[id]/plan` | POST | Generate/regenerate plan |
| `/api/paths/[id]/approve` | POST | Approve plan |
| `/api/paths/[id]/lesson` | POST | Generate next lesson |
| `/api/paths/[id]/complete-day` | POST | Mark day complete with feedback |
| `/api/paths/[id]/adapt` | POST | Trigger adaptation |

### Lessons

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/lessons/[id]` | GET | Get lesson content |
| `/api/lessons/[id]/chat` | POST | Chat with AI about lesson |
| `/api/lessons/[id]/exercise/[eid]/complete` | POST | Complete exercise |
| `/api/lessons/[id]/exercise/[eid]/flag` | POST | Flag for followup |

### Diagrams

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/diagram/chord` | POST | Render chord diagram SVG |
| `/api/diagram/fretboard` | POST | Render fretboard diagram SVG |
| `/api/diagram/tablature` | POST | Render tablature SVG |

### Quick Practice

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/quick-practice` | POST | Generate one-off lesson from prompt |
| `/api/quick-practice/[id]` | GET | Get quick practice lesson |
| `/api/quick-practice/[id]/chat` | POST | Chat within quick practice lesson |
| `/api/quick-practice/[id]/go-deeper` | POST | Convert to Learning Path |

---

## Database Schema Changes (V2)

### New Tables

```sql
-- Learning paths
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  plan JSONB,                    -- LearningPlan JSON
  plan_status TEXT DEFAULT 'draft',
  current_phase INT DEFAULT 1,
  current_day INT DEFAULT 1,
  total_days INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  adaptation_history JSONB DEFAULT '[]'
);

-- Lessons (from Learning Paths OR Quick Practice)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Source (one of these will be set)
  learning_path_id UUID REFERENCES learning_paths(id),  -- NULL for quick practice
  day_number INT,                                        -- NULL for quick practice

  -- Quick Practice specific
  is_quick_practice BOOLEAN DEFAULT false,
  prompt TEXT,                   -- Original user prompt (for quick practice)
  saved BOOLEAN DEFAULT false,   -- User explicitly saved (for quick practice)
  converted_to_path_id UUID,     -- If "Go Deeper" was used

  -- Content
  content JSONB NOT NULL,        -- LessonV2 JSON
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  feedback JSONB                 -- difficulty, time, flags
);

-- Chat threads (multiple per lesson, supports "New Chat" feature)
CREATE TABLE lesson_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) NOT NULL,
  title TEXT,                    -- Auto-generated or user-provided
  is_active BOOLEAN DEFAULT true, -- Current thread for this lesson
  created_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ        -- When user started a new chat
);

-- Chat messages within threads
CREATE TABLE lesson_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES lesson_chat_threads(id) NOT NULL,
  role TEXT NOT NULL,            -- 'user' | 'assistant'
  content TEXT NOT NULL,
  diagrams JSONB,                -- Any diagrams generated in response
  diagram_replacement JSONB,     -- If this message replaced a lesson diagram
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exercise completions
CREATE TABLE exercise_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) NOT NULL,
  exercise_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  minutes_spent INT,
  notes TEXT,
  difficulty_feedback TEXT,
  flagged BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);
```

### RLS Policies

All tables have RLS enabled with user isolation:
```sql
CREATE POLICY "Users can only access their own data"
ON learning_paths FOR ALL
USING (user_id = auth.uid());
```

---

## Technical Architecture

### AI Agent Pipeline (V2)

```
┌─────────────────────────────────────────────────────────────┐
│                    Learning Path Creation                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Request → Scope Analyzer → Plan Generator → Plan      │
│                      ↓                                      │
│               Knowledge Base                                │
│               (RAG retrieval)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Daily Lesson Generation                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Plan Day N → Context Builder → Lesson Generator → Lesson   │
│                     ↓                  ↓                    │
│              Adaptation Data    Diagram Enricher            │
│              - Past feedback    - Chord diagrams            │
│              - Chat history     - Fretboard diagrams        │
│              - Completions      - Tablature                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Chat Interface                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Question → Context Injector → Chat Agent → Response   │
│                        ↓                  ↓                 │
│                 Current Lesson      Diagram Generator       │
│                 User History        (on demand)             │
│                 Music Theory KB                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Diagram Rendering Pipeline

```
DiagramSpec JSON
       ↓
Schema Validation (Zod)
       ↓
Layout Engine (deterministic)
       ↓
SVG Renderer
       ↓
React Component (with interactivity)
```

All diagrams are rendered deterministically from JSON specs. AI never generates pixels.

---

## Success Metrics

### User Engagement
- Learning Path completion rate
- Days per week practiced
- Time spent per session
- Chat questions asked

### Learning Outcomes
- Exercises completed vs. flagged
- Difficulty feedback trends
- Path completion time vs. estimate

### System Health
- Diagram rendering success rate
- AI response latency
- Adaptation trigger frequency

---

## Migration from V1

### Data Migration
- Existing `plans` table remains (backward compatible)
- New V2 users get Learning Paths by default
- V1 plans can be imported as single-day Learning Paths

### Feature Flags
- `v2_learning_paths`: Enable new path UI
- `v2_chat`: Enable chat interface
- `v2_diagrams`: Enable new diagram styles

### Rollout
1. Beta: New users only
2. Gradual: Opt-in for existing users
3. Full: V2 default, V1 available

---

## Non-Goals (V2)

- Audio playback or metronome
- Recording user playing
- Social features / sharing
- Payment processing
- Mobile native app (web responsive only)
- Standard notation (tab only)

---

## Design Decisions (Resolved)

1. **Chat persistence**: History persists across sessions with option to start new chat thread
2. **Multi-path**: Yes, users can have multiple active Learning Paths simultaneously (max 20)
3. **Quick Practice saving**: Optional - user can explicitly save to history
4. **Diagram interactivity**: No hover/tap audio, but diagrams can be modified via chat
5. **Path sharing**: Not in V2
6. **Offline support**: Not in V2

---

## Appendix: Example Learning Path

### Request
"I want to learn jazz comping basics"

### Generated Plan

```
Learning Path: Jazz Comping Fundamentals
Goal: Comp confidently over common jazz standards

Phase 1: Shell Voicings (Days 1-4)
├── Day 1: What are shell voicings? Maj7 shapes
├── Day 2: Min7 and Dom7 shells
├── Day 3: Connecting shells with voice leading
└── Day 4: Shell voicing practice over ii-V-I

Phase 2: Rhythm (Days 5-7)
├── Day 5: Quarter note comping
├── Day 6: Anticipations and Charleston rhythm
└── Day 7: Mixing rhythms freely

Phase 3: Progressions (Days 8-11)
├── Day 8: ii-V-I in all keys (shells)
├── Day 9: I-vi-ii-V turnaround
├── Day 10: Minor ii-V-i
└── Day 11: Blues form basics

Phase 4: Application (Days 12-14)
├── Day 12: Autumn Leaves (A section)
├── Day 13: Autumn Leaves (full form)
└── Day 14: Review + free comping

Estimated: 14 days @ 30 min/day
Prerequisites: Basic open chords, barre chord familiarity
```

---

*End of V2 PRD*

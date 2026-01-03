import type { LessonV1 } from "@/lib/lesson/schema";

export function generatePlaceholderLessonV1(input: {
  date: string; // YYYY-MM-DD
}): LessonV1 {
  return {
    version: "1.0",
    date: input.date,
    title: "Placeholder lesson (v1)",
    focus_prompt:
      "This is a placeholder lesson generator (no AI). It exists to prove the lesson schema + rendering pipeline end-to-end.",
    assumptions: {
      level: "beginner",
      daily_minutes_target: 30,
      instrument: "right-handed 6-string guitar",
      tuning: "EADGBE",
    },
    today_blocks: [
      {
        block: "warmup",
        minutes: 5,
        items: [
          {
            exercise_slug: "warmup-finger-walk-1-2-3-4",
            name: "Finger walk (1–2–3–4) on strings 6–1",
            minutes: 5,
            instructions_md: "Go slow and clean. Alternate pick. Stay relaxed.",
            concept_tags: ["warmup", "alternate-picking"],
          },
        ],
      },
      {
        block: "review",
        minutes: 10,
        items: [
          {
            exercise_slug: "review-shell-voicings-dm7-g7-cmaj7",
            name: "Shell voicings: Dm7 → G7 → Cmaj7 (guide tones)",
            minutes: 10,
            instructions_md:
              "Use simple shells. Keep time. Aim for smooth voice leading between 3rds and 7ths.",
            diagram_specs: [
              {
                type: "chord",
                style: "jazz-clean-v1",
                title: "Dm7 (shell)",
                tuning: ["E2", "A2", "D3", "G3", "B3", "E4"],
                frets: [null, 5, 7, 5, 6, null],
                root_strings: [1],
              },
              {
                type: "chord",
                style: "jazz-clean-v1",
                title: "G7 (shell)",
                tuning: ["E2", "A2", "D3", "G3", "B3", "E4"],
                frets: [3, null, 3, 4, 3, null],
                root_strings: [0],
              },
              {
                type: "chord",
                style: "jazz-clean-v1",
                title: "Cmaj7 (shell)",
                tuning: ["E2", "A2", "D3", "G3", "B3", "E4"],
                frets: [null, 3, 2, 4, 0, null],
                root_strings: [1],
              },
            ],
            concept_tags: ["shell-voicings", "ii-v-i", "voice-leading"],
          },
        ],
      },
      {
        block: "new",
        minutes: 10,
        items: [
          {
            exercise_slug: "new-fretboard-notes-string6",
            name: "Fretboard notes: string 6 naturals (0–7th fret)",
            minutes: 10,
            instructions_md:
              "Say the note names out loud. Then find the same notes in a new position.",
            concept_tags: ["fretboard", "notes"],
          },
        ],
      },
      {
        block: "apply",
        minutes: 5,
        items: [
          {
            exercise_slug: "apply-comping-ii-v-i-c",
            name: "Apply: comp Dm7–G7–Cmaj7 with steady quarter notes",
            minutes: 5,
            instructions_md:
              "Count 1–2–3–4. Keep the chord changes clean. Stay relaxed.",
            concept_tags: ["comping", "time", "ii-v-i"],
          },
        ],
      },
    ],
    review_logic: { include_open_followups: true, prefer_recent_days: 7 },
    sources: [{ type: "placeholder_single_agent", version: "v1" }],
  };
}

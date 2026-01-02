import type { PlanV1 } from "@/lib/plan/schema";
import { PlanV1Schema } from "@/lib/plan/schema";

type FollowupLite = { id: string; title: string };

function sumMinutes(plan: PlanV1) {
  return plan.today_blocks.reduce((acc, b) => acc + (b.minutes ?? 0), 0);
}

export function generatePlanV1(input: {
  date: string; // YYYY-MM-DD
  focusPrompt: string;
  followups?: FollowupLite[];
}): PlanV1 {
  const followup = input.followups?.[0];

  const plan: PlanV1 = {
    version: "1.0",
    date: input.date,
    title: "Daily Practice Plan",
    focus_prompt: input.focusPrompt,
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
            instructions_md:
              "Go slow and clean. Use alternate picking. Keep fingers close to the frets.",
            tab_text:
              "e|----------------1-2-3-4-|\nB|----------1-2-3-4--------|\nG|----1-2-3-4--------------|\nD|1-2-3-4------------------|\nA|-------------------------|\nE|-------------------------|",
            diagram_specs: [],
            concept_tags: ["warmup", "fretting-hand", "alternate-picking"],
            common_mistakes: ["Rushing", "Buzzing notes", "Tension in thumb"],
            success_criteria: ["Even volume", "No buzzing", "Relaxed hands"],
          },
        ],
      },
      {
        block: "review",
        minutes: 10,
        items: [
          ...(followup
            ? [
                {
                  exercise_slug: `followup-${followup.id}`,
                  name: `Follow-up: ${followup.title}`,
                  minutes: 5,
                  instructions_md:
                    "Work slowly and deliberately. Take notes on what still feels unclear.",
                  tab_text: "",
                  diagram_specs: [],
                  concept_tags: ["follow-up"],
                  common_mistakes: ["Skipping the hard part", "Going too fast"],
                  success_criteria: ["Can do it cleanly at a slow tempo"],
                },
              ]
            : []),
          {
            exercise_slug: "review-shells-ii-v-i-in-c",
            name: "Shell voicings: ii–V–I in C (Dm7–G7–Cmaj7)",
            minutes: followup ? 5 : 10,
            instructions_md:
              "Use shell voicings only. Play 4 steady quarter-note strums per chord, then loop.",
            tab_text:
              "Dm7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---5---|\nD|---3---|\nA|---5---|\nE|---x---|\n\nG7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---4---|\nD|---3---|\nA|---5---|\nE|---3---|\n\nCmaj7 (R–7):\n\ne|---x---|\nB|---x---|\nG|---4---|\nD|---2---|\nA|---3---|\nE|---x---|",
            diagram_specs: [],
            concept_tags: ["shell-voicings", "ii-v-i", "comping"],
            common_mistakes: ["Late changes", "Uneven strums"],
            success_criteria: ["Smooth transitions", "Steady time"],
          },
        ],
      },
      {
        block: "new",
        minutes: 10,
        items: [
          {
            exercise_slug: "new-shells-3-7-voice-leading",
            name: "New: 3–7 shell voice-leading (two shapes)",
            minutes: 10,
            instructions_md:
              "Learn two 3–7 shell shapes and move them through ii–V–I in C. Keep your hand relaxed and use minimal motion.",
            tab_text:
              "Example (guide tones only, concept):\n\nDm7: F–C\nG7: F–B\nCmaj7: E–B\n\n(We'll add exact fretboard diagrams soon.)",
            diagram_specs: [],
            concept_tags: ["shell-voicings", "voice-leading", "guide-tones"],
            common_mistakes: ["Gripping too hard", "Not hearing the guide tones"],
            success_criteria: ["Can loop ii–V–I smoothly", "Guide tones ring clearly"],
          },
        ],
      },
      {
        block: "apply",
        minutes: 5,
        items: [
          {
            exercise_slug: "apply-comping-2-feel",
            name: "Apply: comp in 2 (half-notes) over ii–V–I in C",
            minutes: 5,
            instructions_md:
              "Use shell voicings. Play on beats 1 and 3 only. Keep it calm and even.",
            tab_text: "",
            diagram_specs: [],
            concept_tags: ["comping", "time-feel", "ii-v-i"],
            common_mistakes: ["Rushing", "Too much force"],
            success_criteria: ["Even time feel", "Clean chord tones"],
          },
        ],
      },
    ],
    review_logic: {
      include_open_followups: true,
      prefer_recent_days: 7,
    },
    sources: [],
  };

  // Ensure >= 30 total minutes and block.minutes reflect item minutes.
  plan.today_blocks = plan.today_blocks.map((b) => ({
    ...b,
    minutes: b.items.reduce((acc, it) => acc + (it.minutes ?? 0), 0),
  }));

  const total = sumMinutes(plan);
  if (total < 30) {
    // Top up warmup with extra minutes (simple deterministic rule).
    const warmup = plan.today_blocks.find((b) => b.block === "warmup");
    if (warmup?.items?.[0]) {
      warmup.items[0].minutes += 30 - total;
      warmup.minutes = warmup.items.reduce((acc, it) => acc + it.minutes, 0);
    }
  }

  return PlanV1Schema.parse(plan);
}

export function shouldApplyJazzDefault(prompt: string): boolean {
  const p = (prompt ?? "").trim().toLowerCase();
  if (!p) return true;

  const jazzSignals = [
    "jazz",
    "ii-v-i",
    "ii–v–i",
    "shell voicing",
    "shell voicings",
    "guide tone",
    "guide tones",
    "comping",
    "swing",
    "bebop",
    "minor ii-v-i",
    "drop 2",
    "drop-2",
    "turnaround",
    "rhythm changes",
    "standards",
  ];

  const nonJazzSignals = [
    "punk",
    "metal",
    "bluegrass",
    "classical",
    "country",
    "funk",
    "pop",
    "rock",
    "caged",
  ];

  if (jazzSignals.some((s) => p.includes(s))) return true;
  if (nonJazzSignals.some((s) => p.includes(s))) return false;

  // No clear style requested: default to beginner jazz.
  return true;
}

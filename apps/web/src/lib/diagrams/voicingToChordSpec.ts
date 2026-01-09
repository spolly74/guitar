import type { ChordDiagramSpec } from "@/lib/diagrams/chordSpec";

const STANDARD_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"] as const;

export function parseCompactVoicingToFrets(voicing: string): Array<number | null> {
  const s = voicing.trim().toLowerCase();
  // If the voicing is exactly 6 characters (common case), interpret it as
  // one character per string (low E -> high e). This avoids ambiguity where
  // sequences like "23" in "xx0231" should mean two adjacent strings (2,3),
  // not fret 23 on one string.
  if (/^[x0-9]{6}$/.test(s)) {
    return s.split("").map((ch) => {
      if (ch === "x") return null;
      const n = Number(ch);
      if (!Number.isFinite(n) || n < 0 || n > 9) throw new Error(`Invalid fret character: '${ch}'`);
      return n;
    });
  }

  const out: Array<number | null> = [];

  let i = 0;
  while (out.length < 6 && i < s.length) {
    const ch = s[i]!;
    if (ch === "x") {
      out.push(null);
      i += 1;
      continue;
    }
    if (ch === "0") {
      out.push(0);
      i += 1;
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      // For longer encodings, allow 2-digit frets (10..24).
      const two = s.slice(i, i + 2);
      if (two.length === 2 && two[0] >= "0" && two[0] <= "9" && two[1] >= "0" && two[1] <= "9") {
        const n2 = Number(two);
        if (Number.isFinite(n2) && n2 >= 10 && n2 <= 24) {
          out.push(n2);
          i += 2;
          continue;
        }
      }

      const n1 = Number(ch);
      out.push(n1);
      i += 1;
      continue;
    }

    throw new Error(`Invalid voicing character: '${ch}'`);
  }

  if (out.length !== 6) {
    throw new Error(`Voicing must describe 6 strings (got ${out.length}): '${voicing}'`);
  }

  if (i !== s.length) {
    // Extra trailing characters means we couldn't parse cleanly.
    throw new Error(`Voicing has extra characters: '${voicing}'`);
  }

  return out;
}

export function chordSpecFromVoicing(input: {
  chordSymbol: string;
  voicing: string; // e.g. x5x56x (low E -> high e)
  title?: string;
}): ChordDiagramSpec {
  const frets = parseCompactVoicingToFrets(input.voicing);
  return {
    type: "chord",
    style: "jazz-clean-v1",
    title: input.title ?? input.chordSymbol,
    tuning: [...STANDARD_TUNING],
    frets,
  };
}

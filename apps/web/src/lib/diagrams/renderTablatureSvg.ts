import type { TablatureSpec, TablatureBeat, TablatureNote } from "./tablatureSpec";

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getNoteText(note: TablatureNote | number | null): string {
  if (note === null) return "";
  if (typeof note === "number") return note.toString();
  if (typeof note === "object") {
    const fret = note.fret;
    if (typeof fret === "number") return fret.toString();
    return fret; // "x" or "-"
  }
  return "";
}

function getTechnique(note: TablatureNote | number | null): string | undefined {
  if (note === null || typeof note === "number") return undefined;
  return note.technique;
}

export function renderTablatureSvg(spec: TablatureSpec): string {
  // Layout constants
  const stringLabels = ["e", "B", "G", "D", "A", "E"]; // high to low
  const stringCount = 6;

  const padLeft = 30; // Room for string labels
  const padRight = 20;
  const padTop = 50; // Room for title and chord symbols
  const padBottom = 20;

  const lineSpacing = 20; // Vertical space between strings
  const beatWidth = 40; // Horizontal space per beat
  const measurePadding = 10; // Extra space between measures

  // Calculate total beats and width
  let totalBeats = 0;
  for (const measure of spec.measures) {
    totalBeats += measure.beats.length;
  }
  const measureCount = spec.measures.length;

  const gridWidth =
    totalBeats * beatWidth + (measureCount - 1) * measurePadding;
  const gridHeight = (stringCount - 1) * lineSpacing;

  const width = padLeft + gridWidth + padRight;
  const height = padTop + gridHeight + padBottom;

  const colors = {
    bg: "#FFFFFF",
    line: "#111111",
    text: "#111111",
    chord: "#3F3F46",
    title: "#111111",
    technique: "#666666",
  };

  const parts: string[] = [];

  // SVG header
  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
        spec.title ?? "Tablature",
      )}">`
  );

  // Background
  parts.push(
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${colors.bg}"/>`
  );

  // Title
  if (spec.title) {
    parts.push(
      `<text x="${padLeft}" y="20" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="14" font-weight="600" fill="${colors.title}">${escapeXml(
        spec.title,
      )}</text>`
    );
  }

  // Time signature and tempo (optional)
  if (spec.time_signature || spec.tempo) {
    const meta = [spec.time_signature, spec.tempo ? `${spec.tempo} BPM` : ""]
      .filter(Boolean)
      .join(" | ");
    parts.push(
      `<text x="${padLeft}" y="35" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="11" fill="${colors.chord}">${escapeXml(
        meta,
      )}</text>`
    );
  }

  // String labels (TAB indicator style)
  const tabY = padTop + gridHeight / 2;
  parts.push(
    `<text x="8" y="${tabY - lineSpacing}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="12" font-weight="700" fill="${colors.text}">T</text>`
  );
  parts.push(
    `<text x="8" y="${tabY}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="12" font-weight="700" fill="${colors.text}">A</text>`
  );
  parts.push(
    `<text x="8" y="${tabY + lineSpacing}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="12" font-weight="700" fill="${colors.text}">B</text>`
  );

  // Draw 6 horizontal lines (strings)
  for (let s = 0; s < stringCount; s++) {
    const y = padTop + s * lineSpacing;
    parts.push(
      `<line x1="${padLeft}" y1="${y}" x2="${padLeft + gridWidth}" y2="${y}" stroke="${colors.line}" stroke-width="1" />`
    );
  }

  // Draw measures and notes
  let xOffset = padLeft;
  let globalBeatIndex = 0;

  for (let mi = 0; mi < spec.measures.length; mi++) {
    const measure = spec.measures[mi];

    // Draw measure start bar line (except for first measure)
    if (mi > 0) {
      parts.push(
        `<line x1="${xOffset}" y1="${padTop}" x2="${xOffset}" y2="${padTop + gridHeight}" stroke="${colors.line}" stroke-width="2" />`
      );
      xOffset += measurePadding / 2;
    }

    // Draw beats in this measure
    for (let bi = 0; bi < measure.beats.length; bi++) {
      const beat = measure.beats[bi];
      const beatX = xOffset + bi * beatWidth + beatWidth / 2;

      // Check for chord symbol at this beat
      const chordSymbol = spec.chord_symbols?.find(
        (c) => c.beat === globalBeatIndex
      );
      if (chordSymbol) {
        parts.push(
          `<text x="${beatX}" y="${padTop - 10}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="12" font-weight="600" fill="${colors.chord}">${escapeXml(
            chordSymbol.chord,
          )}</text>`
        );
      }

      // Draw notes on each string
      for (let s = 0; s < stringCount; s++) {
        const note = beat.notes[s];
        const noteText = getNoteText(note);
        const technique = getTechnique(note);

        if (noteText) {
          const y = padTop + s * lineSpacing;

          // White background to "erase" the line
          const textWidth = noteText.length * 8;
          parts.push(
            `<rect x="${beatX - textWidth / 2 - 2}" y="${y - 8}" width="${textWidth + 4}" height="16" fill="${colors.bg}" />`
          );

          // Fret number
          parts.push(
            `<text x="${beatX}" y="${y + 4}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="12" font-weight="500" fill="${colors.text}">${escapeXml(
              noteText,
            )}</text>`
          );

          // Technique annotation (above the note)
          if (technique) {
            parts.push(
              `<text x="${beatX + 10}" y="${y - 2}" font-family="ui-sans-serif, system-ui" font-size="9" fill="${colors.technique}">${escapeXml(
                technique,
              )}</text>`
            );
          }
        }
      }

      globalBeatIndex++;
    }

    xOffset += measure.beats.length * beatWidth;

    // Add measure padding
    if (mi < spec.measures.length - 1) {
      xOffset += measurePadding / 2;
    }
  }

  // Draw end bar line (double bar)
  parts.push(
    `<line x1="${padLeft + gridWidth - 4}" y1="${padTop}" x2="${padLeft + gridWidth - 4}" y2="${padTop + gridHeight}" stroke="${colors.line}" stroke-width="1" />`
  );
  parts.push(
    `<line x1="${padLeft + gridWidth}" y1="${padTop}" x2="${padLeft + gridWidth}" y2="${padTop + gridHeight}" stroke="${colors.line}" stroke-width="3" />`
  );

  parts.push(`</svg>`);
  return parts.join("");
}

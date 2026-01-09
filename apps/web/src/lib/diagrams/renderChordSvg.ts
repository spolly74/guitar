import type { ChordDiagramSpec } from "./chordSpec";

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function inferBaseFret(frets: Array<number | null>) {
  const used = frets.filter((f): f is number => typeof f === "number" && f > 0);
  if (used.length === 0) return 1;
  const min = Math.min(...used);
  const max = Math.max(...used);
  // If it's an open position (within first 4 frets), show nut.
  if (min <= 1 && max <= 4) return 1;
  return min;
}

export function renderChordSvg(spec: ChordDiagramSpec): string {
  // Deterministic "jazz-clean-v1" chord grid
  const width = 220;
  const height = 240;
  const padX = 20;
  const padTop = 26;
  const titleY = 18;

  const gridTop = padTop + 10;
  const gridLeft = padX;
  const gridWidth = width - padX * 2;
  const gridHeight = 150;

  const strings = 6;
  const fretsToShow = 5; // typical chord box

  const dx = gridWidth / (strings - 1);
  const dy = gridHeight / fretsToShow;

  const baseFret = spec.base_fret ?? inferBaseFret(spec.frets);
  const showNut = baseFret === 1;

  const colors = {
    bg: "#FFFFFF",
    grid: "#111111",
    dotFill: "#FFFFFF", // Non-root notes: white fill
    dotStroke: "#111111", // Non-root notes: black stroke
    dotText: "#111111", // Non-root notes: black text
    root: "#E11D2E", // Root notes: red fill
    rootText: "#FFFFFF", // Root notes: white text
    title: "#111111",
    meta: "#3F3F46",
  };

  const rootSet = new Set(spec.root_strings ?? []);

  const parts: string[] = [];
  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
        spec.title ?? "Chord diagram",
      )}">`,
  );

  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${colors.bg}"/>`);

  if (spec.title) {
    parts.push(
      `<text x="${width / 2}" y="${titleY}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="16" font-weight="600" fill="${colors.title}">${escapeXml(
        spec.title,
      )}</text>`,
    );
  }

  // X/O markers
  for (let i = 0; i < strings; i++) {
    const x = gridLeft + i * dx;
    const f = spec.frets[i];
    const label = f === null ? "x" : f === 0 ? "o" : "";
    if (label) {
      parts.push(
        `<text x="${x.toFixed(2)}" y="${(gridTop - 10).toFixed(
          2,
        )}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="14" font-weight="700" fill="${colors.meta}">${label}</text>`,
      );
    }
  }

  // Fret number label when not open position
  if (!showNut) {
    parts.push(
      `<text x="${(gridLeft - 10).toFixed(
        2,
      )}" y="${(gridTop + dy * 0.75).toFixed(
        2,
      )}" text-anchor="end" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="12" font-weight="600" fill="${colors.meta}">${baseFret}</text>`,
    );
  }

  // Strings (vertical)
  for (let i = 0; i < strings; i++) {
    const x = gridLeft + i * dx;
    parts.push(
      `<line x1="${x.toFixed(2)}" y1="${gridTop.toFixed(
        2,
      )}" x2="${x.toFixed(2)}" y2="${(gridTop + gridHeight).toFixed(
        2,
      )}" stroke="${colors.grid}" stroke-width="2" />`,
    );
  }

  // Frets (horizontal): draw 6 lines to create 5 spaces
  for (let f = 0; f <= fretsToShow; f++) {
    const y = gridTop + f * dy;
    const strokeWidth = showNut && f === 0 ? 6 : 2;
    parts.push(
      `<line x1="${gridLeft.toFixed(2)}" y1="${y.toFixed(
        2,
      )}" x2="${(gridLeft + gridWidth).toFixed(
        2,
      )}" y2="${y.toFixed(2)}" stroke="${colors.grid}" stroke-width="${strokeWidth}" />`,
    );
  }

  // Dots with optional finger numbers
  const fingerNumbers = spec.finger_numbers;
  for (let i = 0; i < strings; i++) {
    const f = spec.frets[i];
    if (typeof f !== "number" || f <= 0) continue;

    const rel = showNut ? f : f - baseFret + 1;
    if (rel < 1 || rel > fretsToShow) continue;

    const x = gridLeft + i * dx;
    const y = gridTop + (rel - 0.5) * dy;
    const isRoot = rootSet.has(i);

    // Visual language: Root notes are red filled, non-root notes are white with black stroke
    if (isRoot) {
      // Root note: solid red circle
      parts.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="10" fill="${colors.root}" />`,
      );
    } else {
      // Non-root note: white fill with black stroke
      parts.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="10" fill="${colors.dotFill}" stroke="${colors.dotStroke}" stroke-width="2" />`,
      );
    }

    // Render finger number if available
    const fingerNum = fingerNumbers?.[i];
    if (typeof fingerNum === "number" && fingerNum >= 1 && fingerNum <= 4) {
      const textColor = isRoot ? colors.rootText : colors.dotText;
      parts.push(
        `<text x="${x.toFixed(2)}" y="${(y + 4).toFixed(
          2,
        )}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="11" font-weight="700" fill="${textColor}">${fingerNum}</text>`,
      );
    }
  }

  parts.push(`</svg>`);
  return parts.join("");
}

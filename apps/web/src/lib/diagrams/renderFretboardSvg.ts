import type { FretboardDiagramSpec, FretboardMarker } from "./fretboardSpec";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function markerSortKey(m: FretboardMarker) {
  const role = m.role ?? "other";
  const label = m.label ?? "";
  return `${m.fret.toString().padStart(3, "0")}:${m.string}:${role}:${label}`;
}

export function renderFretboardSvg(spec: FretboardDiagramSpec): string {
  // Deterministic layout constants (jazz-clean-v1)
  const width = 720;
  const height = 220;
  const padX = 18;
  const padTop = 18;
  const padBottom = 28;

  const [fretStart, fretEnd] = spec.fret_range;
  const f0 = clamp(Math.floor(fretStart), 0, 24);
  const f1 = clamp(Math.floor(fretEnd), f0 + 1, 24);
  const frets = f1 - f0;

  const gridLeft = padX + 36; // room for string labels (future)
  const gridTop = padTop;
  const gridWidth = width - gridLeft - padX;
  const gridHeight = height - gridTop - padBottom;

  const stringCount = 6;
  const fretCount = frets + 1; // lines include both ends

  const dx = gridWidth / frets;
  const dy = gridHeight / (stringCount - 1);

  const colors = {
    bg: "#F6F0A5", // pale yellow
    grid: "#6B6B6B",
    fretMarker: "#BFBFBF",
    dot: "#111111",
    dotText: "#FFFFFF",
    root: "#E11D2E",
    title: "#111111",
    subtitle: "#3F3F46",
  };

  const showFretNumbers = spec.show_fret_numbers ?? true;
  const colorByRole = spec.color_by_role ?? true;

  // Sort markers deterministically so SVG output is stable even if input order changes.
  const markers = [...(spec.markers ?? [])].sort((a, b) =>
    markerSortKey(a).localeCompare(markerSortKey(b)),
  );

  const parts: string[] = [];
  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
        spec.title ?? "Fretboard diagram",
      )}">`,
  );

  // Background
  parts.push(
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${colors.bg}"/>`,
  );

  // Title
  if (spec.title) {
    parts.push(
      `<text x="${padX}" y="${padTop - 2}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="14" font-weight="600" fill="${colors.title}">${escapeXml(
        spec.title,
      )}</text>`,
    );
  }

  // Grid: frets (vertical)
  for (let i = 0; i < fretCount; i++) {
    const x = gridLeft + i * dx;
    const strokeWidth = f0 === 0 && i === 0 ? 6 : 2;
    parts.push(
      `<line x1="${x.toFixed(2)}" y1="${gridTop.toFixed(
        2,
      )}" x2="${x.toFixed(2)}" y2="${(gridTop + gridHeight).toFixed(
        2,
      )}" stroke="${colors.grid}" stroke-width="${strokeWidth}" />`,
    );
  }

  // Grid: strings (horizontal)
  for (let s = 0; s < stringCount; s++) {
    const y = gridTop + s * dy;
    parts.push(
      `<line x1="${gridLeft.toFixed(2)}" y1="${y.toFixed(
        2,
      )}" x2="${(gridLeft + gridWidth).toFixed(
        2,
      )}" y2="${y.toFixed(2)}" stroke="${colors.grid}" stroke-width="2" />`,
    );
  }

  // Fretboard inlay dots (standard: 3,5,7,9,12)
  const inlays = [3, 5, 7, 9, 12];
  for (const f of inlays) {
    if (f < f0 || f > f1) continue;
    const cx = gridLeft + (f - f0 - 0.5) * dx;
    const cy = gridTop + gridHeight / 2;
    if (Number.isFinite(cx)) {
      if (f === 12) {
        parts.push(
          `<circle cx="${cx.toFixed(2)}" cy="${(cy - dy).toFixed(
            2,
          )}" r="6" fill="${colors.fretMarker}" opacity="0.65" />`,
        );
        parts.push(
          `<circle cx="${cx.toFixed(2)}" cy="${(cy + dy).toFixed(
            2,
          )}" r="6" fill="${colors.fretMarker}" opacity="0.65" />`,
        );
      } else {
        parts.push(
          `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(
            2,
          )}" r="6" fill="${colors.fretMarker}" opacity="0.65" />`,
        );
      }
    }
  }

  // Fret numbers (under the grid)
  if (showFretNumbers) {
    for (let i = 0; i < frets; i++) {
      const fretNumber = f0 + i;
      // Label between fret i and i+1, except open nut label at 0
      const x = gridLeft + (i + 0.5) * dx;
      const y = gridTop + gridHeight + 18;
      if (fretNumber === 0) continue;
      parts.push(
        `<text x="${x.toFixed(
          2,
        )}" y="${y.toFixed(
          2,
        )}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="11" fill="${colors.subtitle}">${fretNumber}</text>`,
      );
    }
  }

  // Markers
  for (const m of markers) {
    if (m.fret < f0 || m.fret > f1) continue;
    if (m.string < 1 || m.string > 6) continue;

    // string=1 is top (high E), string=6 is bottom (low E)
    const sIndex = m.string - 1;
    const y = gridTop + sIndex * dy;

    const isOpen = m.fret === 0;
    const fretOffset = isOpen ? 0.15 : 0.5; // open markers sit just after the nut
    const x = gridLeft + (m.fret - f0 + fretOffset) * dx;

    const role = m.role ?? "other";
    const fill =
      colorByRole && role === "root" ? colors.root : colors.dot;
    const label = m.label ?? "";

    parts.push(
      `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(
        2,
      )}" r="14" fill="${fill}" />`,
    );
    if (label) {
      parts.push(
        `<text x="${x.toFixed(2)}" y="${(y + 4).toFixed(
          2,
        )}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="12" font-weight="700" fill="${colors.dotText}">${escapeXml(
          label,
        )}</text>`,
      );
    }
  }

  parts.push(`</svg>`);
  return parts.join("");
}

/**
 * Loads and parses BDF disciplinari CSV for rule form auto-fill.
 * Maps: name and description (title without year, text only), region (extracted from title).
 */

const BDF_CSV_URL = "/datasets/disciplinari/bdf.csv";

export interface DisciplinareBdfRow {
  /** Full title from CSV (e.g. "Disciplinare Emilia-Romagna 2025") */
  title: string;
  /** Year from CSV - not used in form fields per requirement */
  anno: string;
  url: string;
  /** Title without year, for name/description (solo testo) */
  name: string;
  /** Region extracted from title (e.g. "Emilia-Romagna", "Nazionale") */
  region: string;
}

function stripYearFromTitle(title: string): string {
  return title.replace(/\s*\d{4}\s*$/, "").trim();
}

function extractRegionFromTitle(title: string): string {
  const withoutYear = stripYearFromTitle(title);
  if (withoutYear.includes("Linee Guida Nazionali")) {
    return "Nazionale";
  }
  const match = withoutYear.match(/^Disciplinare\s+(.+)$/i);
  return match ? match[1].trim() : withoutYear;
}

function parseCsvLine(line: string): string[] {
  return line.replace(/\r$/, "").split(",").map((s) => s.trim());
}

/**
 * Fetches BDF disciplinari CSV and returns rows with name (title without year) and region.
 */
export async function fetchDisciplinariBdf(): Promise<DisciplinareBdfRow[]> {
  const res = await fetch(BDF_CSV_URL);
  if (!res.ok) throw new Error("Failed to load disciplinari dataset");
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const rows: DisciplinareBdfRow[] = [];
  const titleIdx = 0;
  const annoIdx = 1;
  const urlIdx = 2;

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const title = (parts[titleIdx] ?? "").trim();
    const anno = (parts[annoIdx] ?? "").trim();
    const url = (parts[urlIdx] ?? "").trim();
    if (!title) continue;

    rows.push({
      title,
      anno,
      url,
      name: stripYearFromTitle(title),
      region: extractRegionFromTitle(title),
    });
  }
  return rows;
}

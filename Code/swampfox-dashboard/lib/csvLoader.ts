// ─────────────────────────────────────────────────────────────────────────────
// Pure Node.js CSV parser — no external dependencies.
// Handles quoted fields, embedded commas, escaped quotes, and CRLF/LF line
// endings. Used by masterData.ts and the Samsara API route to read files
// from OneLake or the local data/ directory.
// SERVER-ONLY: uses Node fs — never import in client components.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";

/** Parse a single CSV line respecting quoted fields. */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside a quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Read a CSV file and return every data row as a plain object keyed by the
 * header row. Empty rows are skipped. Values are always strings — callers
 * are responsible for type coercion.
 */
export function parseCSV(filePath: string): Record<string, string>[] {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    console.warn(`[csvLoader] Cannot read file: ${filePath}`);
    return [];
  }

  // Strip UTF-8 BOM if present (common in Windows / Excel exports)
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map((h) => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip blank lines

    const values = parseLine(line);
    if (values.every((v) => v.trim() === "")) continue; // skip blank rows

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Try multiple possible column names and return the first non-empty value
 * found, or the fallback.
 */
export function col(
  row: Record<string, string>,
  candidates: string[],
  fallback = ""
): string {
  for (const name of candidates) {
    const v = row[name];
    if (v !== undefined && v !== "") return v;
  }
  return fallback;
}

/** Parse a float from a row, returning 0 on failure. */
export function colFloat(
  row: Record<string, string>,
  candidates: string[],
  fallback = 0
): number {
  const raw = col(row, candidates);
  const n = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? fallback : n;
}

/** Parse an int from a row, returning 0 on failure. */
export function colInt(
  row: Record<string, string>,
  candidates: string[],
  fallback = 0
): number {
  const raw = col(row, candidates);
  const n = parseInt(raw.replace(/[^0-9\-]/g, ""), 10);
  return isNaN(n) ? fallback : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data source configuration and OneLake auto-detection.
//
// Priority order:
//   1. Explicit env vars  (DATA_CLAIMS_CSV / DATA_SAMSARA_CSV / DATA_DIR)
//   2. OneLake File Explorer mount  (C:\Users\<user>\OneLake - <org>\...)
//   3. Local data/ directory  (project root)
//   4. Embedded JSON  (swamp_fox_master_data.json — current mock)
//
// SERVER-ONLY: uses Node fs and os — never import in client components.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import os from "os";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DataSource = "onelake" | "env" | "local" | "json";

export interface DataConfig {
  /** Absolute path to claims CSV, or null if not found. */
  claimsCSV: string | null;
  /** Absolute path to Samsara events CSV, or null if not found. */
  samsaraCSV: string | null;
  /** Root of the OneLake mount (e.g. C:\Users\Ben\OneLake - Swamp Fox Agency), or null. */
  oneLakeRoot: string | null;
  /** Lakehouse Files directory (where CSVs should be placed), or null. */
  oneLakeFiles: string | null;
  /** Which data source is active. */
  source: DataSource;
  /** Human-readable description of the active source. */
  description: string;
}

// ── OneLake auto-detection ─────────────────────────────────────────────────

/**
 * Scan the user's home directory for any "OneLake - *" folder created by
 * OneLake File Explorer. Checks common variants:
 *   "OneLake - Microsoft"  (most common — uses tenant name)
 *   "OneLake - Swamp Fox Agency"
 *   Any other "OneLake - *" folder
 */
function findOneLakeRoot(): string | null {
  const home = os.homedir();
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(home);
  } catch {
    return null;
  }
  // Prefer known names first, then any OneLake- prefix
  const priority = ["OneLake - Microsoft", "OneLake - Swamp Fox Agency"];
  const all = entries.filter((e) => e.startsWith("OneLake - "));
  const ordered = [
    ...priority.filter((p) => all.includes(p)),
    ...all.filter((e) => !priority.includes(e)),
  ];
  for (const entry of ordered) {
    const fullPath = path.join(home, entry);
    try {
      if (fs.statSync(fullPath).isDirectory()) return fullPath;
    } catch {
      // OneLake virtual FS can throw on stat — skip
    }
  }
  return null;
}

/**
 * Walk the OneLake directory tree looking for CSV files named
 * "claims.csv" / "claims_*.csv" and "samsara*.csv".
 *
 * OneLake can be structured many ways:
 *   Root > Workspace > Lakehouse.Lakehouse > Files > subfolder > file.csv
 *   Root > Workspace > Files > file.csv
 *   Root > folder > file.csv   (if user organized their own way)
 *
 * We do a bounded depth-first search (max 6 levels) rather than assuming
 * a fixed structure.
 */
interface FoundCSVs { claims: string | null; samsara: string | null; filesRoot: string | null }

function walkForCSVs(dir: string, depth = 0): FoundCSVs {
  const result: FoundCSVs = { claims: null, samsara: null, filesRoot: null };
  if (depth > 6) return result;

  let entries: string[] = [];
  try { entries = fs.readdirSync(dir); } catch { return result; }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const lower = entry.toLowerCase();

    // Check if this entry is a CSV file we care about
    if (lower.endsWith(".csv")) {
      if (!result.claims && (lower === "claims.csv" || lower.startsWith("claims"))) {
        result.claims = fullPath;
        if (!result.filesRoot) result.filesRoot = dir;
      }
      if (!result.samsara && (
        lower.includes("samsara") || lower.includes("speeding") ||
        lower.includes("speed") || lower.includes("safety")
      )) {
        result.samsara = fullPath;
        if (!result.filesRoot) result.filesRoot = dir;
      }
      continue;
    }

    // Recurse into subdirectories
    try {
      if (!fs.statSync(fullPath).isDirectory()) continue;
    } catch { continue; }

    const sub = walkForCSVs(fullPath, depth + 1);
    if (!result.claims  && sub.claims)  { result.claims  = sub.claims;  result.filesRoot = sub.filesRoot ?? dir; }
    if (!result.samsara && sub.samsara) { result.samsara = sub.samsara; result.filesRoot = sub.filesRoot ?? dir; }
    if (result.claims && result.samsara) break; // found both — stop walking
  }

  return result;
}

function findOneLakeFiles(oneLakeRoot: string): { filesPath: string | null; claimsCSV: string | null; samsaraCSV: string | null } {
  const found = walkForCSVs(oneLakeRoot);
  return {
    filesPath:  found.filesRoot,
    claimsCSV:  found.claims,
    samsaraCSV: found.samsara,
  };
}

/** Check if a file exists and is readable (safe wrapper). */
function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// ── Config resolver ───────────────────────────────────────────────────────────

let _config: DataConfig | null = null;

export function getDataConfig(): DataConfig {
  if (_config) return _config;

  // ── 1. Explicit env vars ──────────────────────────────────────────────────
  const envClaims  = process.env.DATA_CLAIMS_CSV;
  const envSamsara = process.env.DATA_SAMSARA_CSV;
  const envDir     = process.env.DATA_DIR;

  if (envClaims || envSamsara || envDir) {
    const claimsCSV  = envClaims  ?? (envDir ? path.join(envDir, "claims.csv")          : null);
    const samsaraCSV = envSamsara ?? (envDir ? path.join(envDir, "samsara_events.csv")  : null);
    _config = {
      claimsCSV:    claimsCSV  && fileExists(claimsCSV)  ? claimsCSV  : null,
      samsaraCSV:   samsaraCSV && fileExists(samsaraCSV) ? samsaraCSV : null,
      oneLakeRoot:  null,
      oneLakeFiles: envDir ?? null,
      source:       "env",
      description:  `Env var path: ${envDir ?? envClaims ?? "custom"}`,
    };
    return _config;
  }

  // ── 2. OneLake File Explorer ──────────────────────────────────────────────
  const oneLakeRoot = findOneLakeRoot();
  if (oneLakeRoot) {
    const found = findOneLakeFiles(oneLakeRoot);
    _config = {
      claimsCSV:    found.claimsCSV,
      samsaraCSV:   found.samsaraCSV,
      oneLakeRoot,
      oneLakeFiles: found.filesPath,
      source:       "onelake",
      description:  `OneLake: ${found.filesPath ?? oneLakeRoot}`,
    };
    console.log(`[dataConfig] OneLake detected at: ${oneLakeRoot}`);
    if (found.claimsCSV)  console.log(`[dataConfig] Claims CSV:  ${found.claimsCSV}`);
    if (found.samsaraCSV) console.log(`[dataConfig] Samsara CSV: ${found.samsaraCSV}`);
    return _config;
  }

  // ── 3. Local data/ directory ─────────────────────────────────────────────
  const localDir   = path.join(process.cwd(), "data");
  const claimsCSV  = path.join(localDir, "claims.csv");
  const samsaraCSV = path.join(localDir, "samsara_events.csv");
  if (fileExists(claimsCSV) || fileExists(samsaraCSV)) {
    _config = {
      claimsCSV:    fileExists(claimsCSV)  ? claimsCSV  : null,
      samsaraCSV:   fileExists(samsaraCSV) ? samsaraCSV : null,
      oneLakeRoot:  null,
      oneLakeFiles: localDir,
      source:       "local",
      description:  `Local data/ folder: ${localDir}`,
    };
    return _config;
  }

  // ── 4. Embedded JSON fallback ─────────────────────────────────────────────
  _config = {
    claimsCSV:    null,
    samsaraCSV:   null,
    oneLakeRoot:  null,
    oneLakeFiles: null,
    source:       "json",
    description:  "Embedded JSON (swamp_fox_master_data.json)",
  };
  return _config;
}

/**
 * Bust the cached config so it is re-detected on the next call.
 * Call this from the /api/reload endpoint.
 */
export function bustDataConfig(): void {
  _config = null;
}

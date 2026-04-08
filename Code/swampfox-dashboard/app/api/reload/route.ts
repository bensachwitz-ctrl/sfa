// ─────────────────────────────────────────────────────────────────────────────
// /api/reload
//
// GET  — Returns current data source status (what's connected, record counts).
// POST — Busts all in-memory caches so next request reloads from CSV/OneLake.
//
// Use this when you drop a new CSV into OneLake or the data/ folder and want
// the dashboard to pick it up immediately (without restarting the server).
// The dashboard calls GET on this route to show the data source indicator.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getDataConfig, bustDataConfig } from "@/lib/dataConfig";
import { bustMasterCache, getMasterClaims, getMasterCompanies } from "@/lib/masterData";
import { bustSamsaraCache } from "@/app/api/samsara/route";
import path from "path";
import fs from "fs";

function fileStats(filePath: string | null): { exists: boolean; sizeMB: number; modified: string } {
  if (!filePath) return { exists: false, sizeMB: 0, modified: "" };
  try {
    const stat = fs.statSync(filePath);
    return {
      exists:   true,
      sizeMB:   Math.round((stat.size / 1024 / 1024) * 100) / 100,
      modified: stat.mtime.toISOString(),
    };
  } catch {
    return { exists: false, sizeMB: 0, modified: "" };
  }
}

export async function GET() {
  const cfg = getDataConfig();

  // Load counts from current cache (fast — already in memory)
  let claimCount   = 0;
  let companyCount = 0;
  try {
    claimCount   = getMasterClaims().length;
    companyCount = getMasterCompanies().length;
  } catch {
    // Data not yet loaded
  }

  const oneLakeAvailable = Boolean(cfg.oneLakeRoot);
  const claimsFile       = fileStats(cfg.claimsCSV);
  const samsaraFile      = fileStats(cfg.samsaraCSV);

  // Where to put files if OneLake is mounted
  const dropPath = cfg.oneLakeFiles
    ?? path.join(process.cwd(), "data");

  return NextResponse.json({
    source:      cfg.source,
    description: cfg.description,
    oneLake: {
      mounted:   oneLakeAvailable,
      root:      cfg.oneLakeRoot,
      filesPath: cfg.oneLakeFiles,
    },
    files: {
      claims: {
        path:     cfg.claimsCSV,
        ...claimsFile,
        expectedAt: path.join(dropPath, "claims.csv"),
      },
      samsara: {
        path:     cfg.samsaraCSV,
        ...samsaraFile,
        expectedAt: path.join(dropPath, "samsara_events.csv"),
      },
    },
    records: {
      claims:    claimCount,
      companies: companyCount,
    },
    lastChecked: new Date().toISOString(),
  });
}

export async function POST() {
  // Bust all caches — next data access will reload from file
  bustDataConfig();
  bustMasterCache();
  bustSamsaraCache();

  // Re-detect config with fresh eyes
  const cfg = getDataConfig();

  // Eagerly reload claims so the response includes the new count
  let claimCount   = 0;
  let companyCount = 0;
  let error: string | null = null;
  try {
    claimCount   = getMasterClaims().length;
    companyCount = getMasterCompanies().length;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    reloaded:    true,
    source:      cfg.source,
    description: cfg.description,
    records: {
      claims:    claimCount,
      companies: companyCount,
    },
    error,
    reloadedAt: new Date().toISOString(),
  });
}

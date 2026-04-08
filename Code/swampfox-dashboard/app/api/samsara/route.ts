import { NextRequest, NextResponse } from "next/server";
import { getDataConfig } from "@/lib/dataConfig";
import { parseCSV, col, colFloat } from "@/lib/csvLoader";
import type { SpeedingEvent } from "@/lib/samsaraData";
import {
  getSpeedingEvents,
  getSpeedingKPIs,
  getDriverSummary,
  getSamsaraCompanies,
} from "@/lib/samsaraData";
import { querySamsara } from "@/lib/fabricClient";
import { SQL } from "@/lib/fabricDb";

// ── Samsara CSV cache ─────────────────────────────────────────────────────────
// Keeps parsed events in memory for 5 minutes so every map render
// does not hit the file system.

const CACHE_TTL_MS = 5 * 60 * 1000;
let _csvEvents: SpeedingEvent[] | null = null;
let _csvLoadedAt = 0;

export function bustSamsaraCache() {
  _csvEvents = null;
  _csvLoadedAt = 0;
}

// ── CSV format detection ──────────────────────────────────────────────────────
//
// Two formats are supported:
//
// FORMAT A — gold_speeding_driver_daily (your actual Fabric table)
//   Columns: company_key, driver_name, bucket_1_5_count, bucket_6_10_count,
//            bucket_11_15_count, bucket_16_plus_count, distance_miles
//   This is the aggregated daily summary exported from Power BI / Fabric SQL.
//   No GPS coordinates — severity is derived from speed buckets.
//
// FORMAT B — Samsara Safety Events export (individual events with GPS)
//   Columns: Occurred At, Driver Name, Vehicle Name, Group Name,
//            Max Speed (mph), Speed Limit (mph), Latitude, Longitude, State
//
// The loader auto-detects which format is present by checking for column names.

function isGoldFormat(headers: string[]): boolean {
  return headers.some((h) =>
    h.toLowerCase().includes("bucket") ||
    h === "company_key" ||
    h === "driver_name" && headers.some((hh) => hh.includes("count"))
  );
}

/**
 * Convert gold_speeding_driver_daily rows into SpeedingEvent[].
 * Since there are no timestamps or GPS coordinates, we synthesise them so
 * the rest of the dashboard (driver table, KPIs, filters) works correctly.
 * The map will show approximate company locations from the claims data.
 */
function goldRowsToEvents(rows: Record<string, string>[]): SpeedingEvent[] {
  const events: SpeedingEvent[] = [];
  const now = new Date();

  // Rough lat/lng centres for SE US states (covers most forestry/trucking ops)
  const STATE_CENTERS: Record<string, [number, number]> = {
    SC: [33.8, -80.9], NC: [35.5, -79.0], GA: [32.5, -83.5],
    FL: [27.5, -81.5], VA: [37.5, -79.0], TN: [35.8, -86.0],
    AL: [32.8, -86.8], MS: [32.4, -89.7],
  };

  rows.forEach((row, rowIdx) => {
    const companyKey  = col(row, ["company_key", "Company", "company"]);
    const driverName  = col(row, ["driver_name",  "Driver",  "driver"]);
    if (!companyKey && !driverName) return;

    const b1  = colFloat(row, ["bucket_1_5_count",   "1_5_count",   "bucket_1_5"]);
    const b2  = colFloat(row, ["bucket_6_10_count",  "6_10_count",  "bucket_6_10"]);
    const b3  = colFloat(row, ["bucket_11_15_count", "11_15_count", "bucket_11_15"]);
    const b4  = colFloat(row, ["bucket_16_plus_count","16_plus_count","bucket_16_plus","16plus"]);

    // Expand each bucket count into individual synthetic events
    const buckets: Array<{ count: number; overage: number; severity: SpeedingEvent["severity"] }> = [
      { count: Math.round(b1), overage: 3,  severity: "low"    },
      { count: Math.round(b2), overage: 8,  severity: "low"    },
      { count: Math.round(b3), overage: 13, severity: "medium" },
      { count: Math.round(b4), overage: 20, severity: "high"   },
    ];

    // Default state derived from company name or fallback to SC
    let lat = 33.8, lng = -80.9;
    const stateMatch = Object.entries(STATE_CENTERS).find(([st]) =>
      companyKey.toUpperCase().includes(st) || driverName.toUpperCase().includes(st)
    );
    if (stateMatch) [lat, lng] = stateMatch[1];

    buckets.forEach(({ count, overage, severity }, bIdx) => {
      for (let i = 0; i < count; i++) {
        // Spread events across last 90 days with slight lat/lng scatter
        const daysAgo = Math.round((rowIdx * 7 + bIdx * 3 + i) % 90);
        const ts = new Date(now);
        ts.setDate(ts.getDate() - daysAgo);

        const scatter = 0.5;
        const latOff  = ((rowIdx * 0.1 + i * 0.07) % scatter) - scatter / 2;
        const lngOff  = ((rowIdx * 0.13 + i * 0.09) % scatter) - scatter / 2;

        events.push({
          id:               `gold-${rowIdx}-${bIdx}-${i}`,
          company_key:      companyKey || "Unknown",
          vehicle_id:       `${companyKey}-${bIdx}`,
          vehicle_name:     `Fleet Vehicle`,
          driver_name:      driverName || "Unknown Driver",
          timestamp:        ts.toISOString(),
          lat:              parseFloat((lat + latOff).toFixed(5)),
          lng:              parseFloat((lng + lngOff).toFixed(5)),
          speed_mph:        55 + overage,
          posted_speed_mph: 55,
          overage_mph:      overage,
          severity,
          state:            stateMatch ? stateMatch[0] : "SC",
        });
      }
    });
  });

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Convert a Samsara individual safety-events CSV row to a SpeedingEvent.
 */
function samsaraRowToEvent(row: Record<string, string>, index: number): SpeedingEvent | null {
  const timestamp = col(row, ["Occurred At", "Happened At", "Start Time", "Time", "occurred_at"]);
  if (!timestamp) return null;

  let isoTimestamp = timestamp;
  try {
    isoTimestamp = new Date(timestamp).toISOString();
  } catch { return null; }

  const driverName  = col(row, ["Driver Name", "Driver", "driver_name"]);
  const vehicleName = col(row, ["Vehicle Name", "Vehicle", "vehicle_name", "Unit"]);
  const vehicleId   = col(row, ["Vehicle Serial", "Vehicle ID", "vehicle_id"]) || vehicleName;
  const companyKey  = col(row, ["Group Name", "Group", "Tag", "Fleet", "Account", "company_key"]);
  const speedMph    = colFloat(row, ["Max Speed (mph)", "Speed (mph)", "speed_mph", "MaxSpeed"]);
  const postedMph   = colFloat(row, ["Speed Limit (mph)", "Posted Speed", "Speed Limit", "posted_speed_mph"]);
  const overageMph  = speedMph - postedMph;
  const lat         = colFloat(row, ["Latitude", "Start Latitude", "Lat", "latitude"]);
  const lng         = colFloat(row, ["Longitude", "Start Longitude", "Lng", "longitude"]);
  let state         = col(row, ["State", "US State", "state"]);
  if (!state) {
    const addr = col(row, ["Address", "Start Address", "Location"]);
    const m = addr.match(/,\s*([A-Z]{2})\b/);
    if (m) state = m[1];
  }

  const severity: SpeedingEvent["severity"] =
    overageMph >= 20 ? "high" : overageMph >= 10 ? "medium" : "low";

  return {
    id: `csv-${index}`, company_key: companyKey || "Unknown",
    vehicle_id: vehicleId, vehicle_name: vehicleName, driver_name: driverName,
    timestamp: isoTimestamp, lat, lng,
    speed_mph: speedMph, posted_speed_mph: postedMph, overage_mph: overageMph,
    severity, state,
  };
}

function loadCsvEvents(): SpeedingEvent[] {
  if (_csvEvents && Date.now() - _csvLoadedAt < CACHE_TTL_MS) {
    return _csvEvents;
  }

  const cfg = getDataConfig();
  if (!cfg.samsaraCSV) return [];

  try {
    const rows = parseCSV(cfg.samsaraCSV);
    if (rows.length === 0) return [];

    const headers = Object.keys(rows[0]);
    let events: SpeedingEvent[];

    if (isGoldFormat(headers)) {
      // Your actual Fabric table: gold_speeding_driver_daily
      events = goldRowsToEvents(rows);
      console.log(`[samsara] Loaded ${rows.length} driver rows (gold format) → ${events.length} events`);
    } else {
      // Individual Samsara safety events export
      events = rows
        .map((r, i) => samsaraRowToEvent(r, i))
        .filter((e): e is SpeedingEvent => e !== null && e.overage_mph > 0);
      console.log(`[samsara] Loaded ${events.length} individual events from CSV`);
    }

    _csvEvents   = events;
    _csvLoadedAt = Date.now();
    return events;
  } catch (err) {
    console.error("[samsara] CSV load error:", err);
    return [];
  }
}

// ── KPI helpers (applied to any event array) ──────────────────────────────────

function computeKPIs(events: SpeedingEvent[], daysBack: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const recent = events.filter((e) => new Date(e.timestamp) >= cutoff);

  const byCompany = new Map<string, number>();
  for (const e of recent)
    byCompany.set(e.company_key, (byCompany.get(e.company_key) ?? 0) + 1);
  const topEntry = [...byCompany.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totalEvents:         recent.length,
    highSeverityEvents:  recent.filter((e) => e.severity === "high").length,
    avgEventsPerCompany: byCompany.size > 0 ? Math.round(recent.length / byCompany.size) : 0,
    topCompany:          topEntry?.[0] ?? "—",
    topCompanyCount:     topEntry?.[1] ?? 0,
    mostRecentEvent:     recent[0]?.timestamp ?? "",
    uniqueVehicles:      new Set(recent.map((e) => e.vehicle_id)).size,
    uniqueDrivers:       new Set(recent.map((e) => e.driver_name)).size,
  };
}

function computeDriverSummary(events: SpeedingEvent[]) {
  const map = new Map<string, {
    driver: string; company: string; events: number;
    highEvents: number; worstOverage: number; lastEvent: string;
  }>();
  for (const e of events) {
    const key = `${e.driver_name}|${e.company_key}`;
    if (!map.has(key))
      map.set(key, { driver: e.driver_name, company: e.company_key, events: 0, highEvents: 0, worstOverage: 0, lastEvent: "" });
    const d = map.get(key)!;
    d.events++;
    if (e.severity === "high") d.highEvents++;
    if (e.overage_mph > d.worstOverage) d.worstOverage = e.overage_mph;
    if (!d.lastEvent || e.timestamp > d.lastEvent) d.lastEvent = e.timestamp;
  }
  return [...map.values()].sort((a, b) => b.highEvents - a.highEvents || b.events - a.events);
}

// ── Fabric → SpeedingEvent converter ─────────────────────────────────────────

interface FabricSpeedRow {
  company_key: string;
  driver_name: string;
  bucket_1_5_count: number;
  bucket_6_10_count: number;
  bucket_11_15_count: number;
  bucket_16_plus_count: number;
  distance_miles: number;
}

async function loadFabricEvents(): Promise<SpeedingEvent[] | null> {
  const rows = await querySamsara<FabricSpeedRow>(SQL.samsaraAll);
  if (!rows || rows.length === 0) return null;
  // Reuse the existing gold-format converter
  return goldRowsToEvents(
    rows.map((r) => ({
      company_key:           r.company_key ?? "",
      driver_name:           r.driver_name ?? "",
      bucket_1_5_count:      String(r.bucket_1_5_count ?? 0),
      bucket_6_10_count:     String(r.bucket_6_10_count ?? 0),
      bucket_11_15_count:    String(r.bucket_11_15_count ?? 0),
      bucket_16_plus_count:  String(r.bucket_16_plus_count ?? 0),
      distance_miles:        String(r.distance_miles ?? 0),
    }))
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action   = searchParams.get("action") ?? "events";
  const company  = searchParams.get("company") ?? undefined;
  const severity = searchParams.get("severity") as "low" | "medium" | "high" | "all" | undefined;
  const dateFrom = searchParams.get("from") ?? undefined;
  const dateTo   = searchParams.get("to") ?? undefined;
  const state    = searchParams.get("state") ?? undefined;
  const days     = parseInt(searchParams.get("days") ?? "30");

  try {
    // Priority: Fabric SFA_OPS → local CSV → mock
    const fabricEvents = await loadFabricEvents();
    const csvEvents    = fabricEvents ?? loadCsvEvents();
    const useCSV       = csvEvents.length > 0;
    const dataSource   = fabricEvents ? "fabric" : useCSV ? "csv" : "mock";

    // Apply filters to whichever source we're using
    const allEvents: SpeedingEvent[] = useCSV ? csvEvents : getSpeedingEvents();
    const filtered = allEvents.filter((e) => {
      if (company  && company  !== "All" && e.company_key !== company)  return false;
      if (severity && severity !== "all" && e.severity    !== severity)  return false;
      if (dateFrom && e.timestamp < dateFrom) return false;
      if (dateTo   && e.timestamp > dateTo + "T23:59:59") return false;
      if (state    && state !== "All"    && e.state       !== state)     return false;
      return true;
    });

    if (action === "kpis") {
      return NextResponse.json(
        useCSV ? computeKPIs(allEvents, days) : getSpeedingKPIs(days)
      );
    }
    if (action === "drivers") {
      return NextResponse.json(
        useCSV ? computeDriverSummary(allEvents) : getDriverSummary()
      );
    }
    if (action === "companies") {
      const companies = useCSV
        ? [...new Set(allEvents.map((e) => e.company_key))].sort()
        : getSamsaraCompanies();
      return NextResponse.json(companies);
    }
    if (action === "source") {
      const cfg = getDataConfig();
      return NextResponse.json({
        source:      dataSource,
        description: fabricEvents ? `Live from Fabric SFA_OPS.${process.env.FABRIC_TABLE_SAMSARA ?? "gold_speeding_driver_daily"}` : cfg.description,
        usingCSV:    useCSV,
        eventCount:  allEvents.length,
        samsaraCSV:  cfg.samsaraCSV,
      });
    }

    if (action === "buckets") {
      // Per-driver bucket breakdown (for Speed Reports page)
      // Try to get raw Fabric bucket data first, fall back to synthesizing from events
      const fabricRows = await querySamsara<{
        company_key: string; driver_name: string;
        bucket_1_5_count: number; bucket_6_10_count: number;
        bucket_11_15_count: number; bucket_16_plus_count: number;
        distance_miles: number;
      }>(SQL.samsaraAll);

      if (fabricRows && fabricRows.length > 0) {
        return NextResponse.json(fabricRows.map((r) => ({
          driver:    r.driver_name ?? "",
          company:   r.company_key ?? "",
          b1:  Number(r.bucket_1_5_count)     || 0,
          b2:  Number(r.bucket_6_10_count)    || 0,
          b3:  Number(r.bucket_11_15_count)   || 0,
          b4:  Number(r.bucket_16_plus_count) || 0,
          miles: Number(r.distance_miles)     || 0,
        })));
      }

      // Synthesize from events
      const bucketMap = new Map<string, { driver: string; company: string; b1: number; b2: number; b3: number; b4: number; miles: number }>();
      for (const e of allEvents) {
        const key = `${e.driver_name}|${e.company_key}`;
        if (!bucketMap.has(key)) bucketMap.set(key, { driver: e.driver_name, company: e.company_key, b1:0, b2:0, b3:0, b4:0, miles:0 });
        const b = bucketMap.get(key)!;
        if (e.overage_mph <= 5)       b.b1++;
        else if (e.overage_mph <= 10) b.b2++;
        else if (e.overage_mph <= 15) b.b3++;
        else                          b.b4++;
      }
      return NextResponse.json([...bucketMap.values()]);
    }

    // Default: filtered events
    return NextResponse.json(
      company ? allEvents.filter((e) => e.company_key === company) : filtered
    );
  } catch (err) {
    console.error("Samsara API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

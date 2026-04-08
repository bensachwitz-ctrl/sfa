// ─────────────────────────────────────────────────────────────────────────────
// Samsara Telematics Data Module
//
// CURRENT: Returns mock data matching the Fabric gold table schema so the
// full map and reporting UI is functional immediately.
//
// TO CONNECT FABRIC:
//   1. Set env vars in .env.local:
//      FABRIC_SQL_ENDPOINT=xxxxx.datawarehouse.fabric.microsoft.com
//      FABRIC_DATABASE=SFA_OPS
//      AZURE_SP_CLIENT_ID=...  AZURE_SP_CLIENT_SECRET=...  AZURE_SP_TENANT_ID=...
//      SAMSARA_SPEEDING_TABLE=gold_speeding_vehicles
//
//   2. Replace the getMockSpeedingEvents() call in getSpeedingEvents() with:
//      const result = await fabricDb.query(`
//        SELECT company_key, vehicle_id, vehicle_name, driver_name,
//               event_timestamp as timestamp,
//               latitude as lat, longitude as lng,
//               speed_mph, posted_speed_mph,
//               (speed_mph - posted_speed_mph) as overage_mph,
//               state
//        FROM ${process.env.SAMSARA_SPEEDING_TABLE ?? 'gold_speeding_vehicles'}
//        ${companyKey ? "WHERE company_key = @company" : ""}
//        ORDER BY event_timestamp DESC
//      `, companyKey ? { company: companyKey } : {});
//      return result.recordset;
// ─────────────────────────────────────────────────────────────────────────────

export interface SpeedingEvent {
  id: string;
  company_key: string;   // matches CompanySummary.name from clientData
  vehicle_id: string;
  vehicle_name: string;
  driver_name: string;
  timestamp: string;     // ISO 8601
  lat: number;
  lng: number;
  speed_mph: number;
  posted_speed_mph: number;
  overage_mph: number;   // speed_mph - posted_speed_mph
  severity: "low" | "medium" | "high"; // <10 | 10-20 | >20 over
  state: string;
}

export interface SpeedingKPIs {
  totalEvents: number;
  highSeverityEvents: number;
  avgEventsPerCompany: number;
  topCompany: string;
  topCompanyCount: number;
  mostRecentEvent: string;
  uniqueVehicles: number;
  uniqueDrivers: number;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
// Spread across companies that appear in the claims data,
// in states matching their operating areas.

const SAMSARA_COMPANIES = [
  { key: "AYRES FORESTRY INC",            state: "SC", lat: 33.8, lng: -80.9 },
  { key: "CAROLINA TIMBER CO",            state: "NC", lat: 35.3, lng: -79.0 },
  { key: "PALMETTO TRUCKING LLC",         state: "SC", lat: 34.0, lng: -81.0 },
  { key: "LOWCOUNTRY HAULERS INC",        state: "SC", lat: 32.7, lng: -80.0 },
  { key: "BLUE RIDGE TRANSPORT",          state: "NC", lat: 35.9, lng: -82.0 },
  { key: "PINES LOGGING CORP",            state: "GA", lat: 31.5, lng: -83.0 },
  { key: "SOUTHERN TIMBER SERVICES",      state: "SC", lat: 33.5, lng: -79.8 },
  { key: "MIDLANDS TRUCKING LLC",         state: "SC", lat: 34.1, lng: -81.3 },
];

const DRIVER_NAMES = [
  "James Tanner", "Robert Hicks", "Michael Owens", "David Pruett",
  "William Faulk", "Thomas Bates", "Charles Strom", "Daniel Layne",
  "Matthew Cribb", "Anthony Padgett", "Mark Drafts", "Steven Wannamaker",
];

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getMockSpeedingEvents(): SpeedingEvent[] {
  const events: SpeedingEvent[] = [];
  const now = new Date("2026-04-08");

  SAMSARA_COMPANIES.forEach((co, coIdx) => {
    // Each company gets 15–45 events over last 90 days
    const count = 15 + Math.floor(seededRand(coIdx * 13) * 30);

    for (let i = 0; i < count; i++) {
      const seed = coIdx * 1000 + i;
      const daysAgo = Math.floor(seededRand(seed) * 90);
      const ts = new Date(now);
      ts.setDate(ts.getDate() - daysAgo);
      ts.setHours(Math.floor(seededRand(seed + 1) * 24));
      ts.setMinutes(Math.floor(seededRand(seed + 2) * 60));

      const postedSpeed = [35, 45, 55, 65, 70][Math.floor(seededRand(seed + 3) * 5)];

      // Weight toward low severity, some medium, fewer high
      const r = seededRand(seed + 4);
      let overage: number;
      if (r < 0.55) overage = 2 + Math.floor(seededRand(seed + 5) * 8);          // low: 2-9
      else if (r < 0.85) overage = 10 + Math.floor(seededRand(seed + 5) * 10);   // medium: 10-19
      else overage = 20 + Math.floor(seededRand(seed + 5) * 15);                  // high: 20-34

      const severity: SpeedingEvent["severity"] =
        overage >= 20 ? "high" : overage >= 10 ? "medium" : "low";

      const speedMph = postedSpeed + overage;
      const driverIdx = Math.floor(seededRand(seed + 6) * DRIVER_NAMES.length);
      const vehicleNum = 100 + Math.floor(seededRand(seed + 7) * 80);

      // Scatter lat/lng within ~50 mile radius of company base
      const latOffset = (seededRand(seed + 8) - 0.5) * 1.2;
      const lngOffset = (seededRand(seed + 9) - 0.5) * 1.5;

      events.push({
        id: `${coIdx}-${i}`,
        company_key:    co.key,
        vehicle_id:     `VH-${coIdx}${vehicleNum}`,
        vehicle_name:   `Truck #${vehicleNum}`,
        driver_name:    DRIVER_NAMES[driverIdx],
        timestamp:      ts.toISOString(),
        lat:            parseFloat((co.lat + latOffset).toFixed(5)),
        lng:            parseFloat((co.lng + lngOffset).toFixed(5)),
        speed_mph:      speedMph,
        posted_speed_mph: postedSpeed,
        overage_mph:    overage,
        severity,
        state:          co.state,
      });
    }
  });

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ── Module cache ──────────────────────────────────────────────────────────────
let _events: SpeedingEvent[] | null = null;

function getAllEvents(): SpeedingEvent[] {
  if (!_events) _events = getMockSpeedingEvents();
  return _events;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface SpeedingFilters {
  company?: string;
  severity?: "low" | "medium" | "high" | "all";
  dateFrom?: string;  // ISO date string
  dateTo?: string;
  state?: string;
}

export function getSpeedingEvents(filters?: SpeedingFilters): SpeedingEvent[] {
  let events = getAllEvents();
  if (!filters) return events;

  const { company, severity, dateFrom, dateTo, state } = filters;
  if (company && company !== "All")   events = events.filter((e) => e.company_key === company);
  if (severity && severity !== "all") events = events.filter((e) => e.severity === severity);
  if (dateFrom) events = events.filter((e) => e.timestamp >= dateFrom);
  if (dateTo)   events = events.filter((e) => e.timestamp <= dateTo + "T23:59:59");
  if (state && state !== "All") events = events.filter((e) => e.state === state);

  return events;
}

export function getSpeedingKPIs(daysBack = 30): SpeedingKPIs {
  const cutoff = new Date("2026-04-08");
  cutoff.setDate(cutoff.getDate() - daysBack);
  const recent = getAllEvents().filter((e) => new Date(e.timestamp) >= cutoff);

  const byCompany = new Map<string, number>();
  for (const e of recent) byCompany.set(e.company_key, (byCompany.get(e.company_key) ?? 0) + 1);

  const topEntry = [...byCompany.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totalEvents:        recent.length,
    highSeverityEvents: recent.filter((e) => e.severity === "high").length,
    avgEventsPerCompany: byCompany.size > 0 ? Math.round(recent.length / byCompany.size) : 0,
    topCompany:         topEntry?.[0] ?? "—",
    topCompanyCount:    topEntry?.[1] ?? 0,
    mostRecentEvent:    recent[0]?.timestamp ?? "",
    uniqueVehicles:     new Set(recent.map((e) => e.vehicle_id)).size,
    uniqueDrivers:      new Set(recent.map((e) => e.driver_name)).size,
  };
}

export function getSpeedingByCompany(companyKey: string): SpeedingEvent[] {
  return getAllEvents().filter((e) => e.company_key === companyKey);
}

export function getSamsaraCompanies(): string[] {
  return [...new Set(getAllEvents().map((e) => e.company_key))].sort();
}

export function getDriverSummary(): {
  driver: string; company: string; events: number;
  highEvents: number; worstOverage: number; lastEvent: string;
}[] {
  const map = new Map<string, ReturnType<typeof getDriverSummary>[0]>();
  for (const e of getAllEvents()) {
    const key = `${e.driver_name}|${e.company_key}`;
    if (!map.has(key)) {
      map.set(key, { driver: e.driver_name, company: e.company_key, events: 0, highEvents: 0, worstOverage: 0, lastEvent: "" });
    }
    const d = map.get(key)!;
    d.events++;
    if (e.severity === "high") d.highEvents++;
    if (e.overage_mph > d.worstOverage) d.worstOverage = e.overage_mph;
    if (!d.lastEvent || e.timestamp > d.lastEvent) d.lastEvent = e.timestamp;
  }
  return [...map.values()].sort((a, b) => b.highEvents - a.highEvents || b.events - a.events);
}

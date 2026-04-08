// ─────────────────────────────────────────────────────────────────────────────
// Master data service — reads swamp_fox_master_data.json
//
// This is the primary data layer until Microsoft Fabric is connected.
// All public functions mirror the shape that Fabric SQL will return, so
// swapping data sources only requires updating API routes — not UI components.
//
// SERVER-ONLY: this file uses Node fs. Import only in API routes / server code.
// ─────────────────────────────────────────────────────────────────────────────

import path from "path";
import fs from "fs";
import { getDataConfig } from "./dataConfig";
import { parseCSV, col, colFloat, colInt } from "./csvLoader";

// ── Raw JSON shape ─────────────────────────────────────────────────────────────

interface RawClaim {
  Carrier: string;
  Insured: string;
  PolicyNumber: string;
  PolicyYear: number;
  ClaimNumber: string;
  DateOfLoss: string;
  Inception?: string;
  Expiration?: string;
  Status: string;
  ClaimType: string;
  Line: string;
  CauseOfLoss?: string;
  Category?: string;
  TotalPaid: number;
  TotalReserve: number;
  TotalIncurred: number;
  Recovery?: number;
  Deductible?: number;
  AccidentDesc?: string;
  Driver?: string;
  Claimant?: string;
  State?: string;
  CloseDate?: string;
}

interface RawCompanyInfo {
  name: string;
  dot?: string;
  address?: string;
  saferRating?: string;
  operatingStatus?: string;
  vehicleInspections?: number;
  vehicleOOSRate?: string | number;
  driverInspections?: number;
  driverOOSRate?: string | number | null;
}

interface RawMasterData {
  metadata: {
    generated: string;
    totalClaims: number;
    carriers: string[];
    totalCompanies: number;
    totalIncurred: number;
  };
  claims: RawClaim[];
  companies?: Record<string, RawCompanyInfo>;
}

// ── Public types ───────────────────────────────────────────────────────────────

export interface MasterClaim {
  carrier: string;
  insured: string;
  policyNumber: string;
  policyYear: number;
  claimNumber: string;
  dateOfLoss: string;
  inception: string;
  expiration: string;
  status: "Open" | "Closed";
  claimType: string;
  line: "AL" | "GL" | "APD";
  causeOfLoss: string;
  category: string;
  totalPaid: number;
  totalReserve: number;
  totalIncurred: number;
  recovery: number;
  deductible: number;
  accidentDesc: string;
  driver: string;
  claimant: string;
  state: string;
  closeDate: string;
}

export interface CompanySummary {
  id: string;             // = insured name (URL-encoded in routes)
  name: string;
  dot: string;
  address: string;
  saferRating: string;
  operatingStatus: string;
  vehicleInspections: number;
  vehicleOOSRate: number | null;
  driverInspections: number;
  driverOOSRate: number | null;
  totalClaims: number;
  openClaims: number;
  closedClaims: number;
  totalIncurred: number;
  totalPaid: number;
  totalReserved: number;
  topCategory: string;
  topLine: string;
  carriers: string[];
  states: string[];
  lastLossDate: string;
  firstLossDate: string;
  riskScore: number; // 0–100 derived
}

export interface CompanyDetail extends CompanySummary {
  claims: MasterClaim[];
  claimsByYear: ClaimsByYearPoint[];
  claimsByCategory: ClaimsByCategoryPoint[];
  claimsByLine: ClaimsByLinePoint[];
}

export interface ClaimsByYearPoint {
  year: number;
  count: number;
  incurred: number;
  paid: number;
  reserved: number;
}

export interface ClaimsByCategoryPoint {
  category: string;
  count: number;
  incurred: number;
}

export interface ClaimsByLinePoint {
  line: string;
  count: number;
  incurred: number;
}

export interface PortfolioKPIs {
  totalClaims: number;
  openClaims: number;
  closedClaims: number;
  totalIncurred: number;
  totalPaid: number;
  totalReserved: number;
  totalCompanies: number;
  companiesWithOpenClaims: number;
  avgClaimsPerCompany: number;
  avgIncurredPerClaim: number;
}

export interface PortfolioCharts {
  incurredByYear: Array<{ year: string; incurred: number; paid: number; reserved: number; claims: number }>;
  claimsByLine: Array<{ line: string; count: number; incurred: number }>;
  claimsByCarrier: Array<{ carrier: string; count: number; incurred: number }>;
  claimsByCategory: Array<{ category: string; count: number; incurred: number }>;
  topByIncurred: Array<{ name: string; incurred: number; openClaims: number; totalClaims: number }>;
}

// ── Raw data loader — CSV or JSON, with 5-minute TTL cache ───────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let _raw: RawMasterData | null = null;
let _rawLoadedAt = 0;

/**
 * Map one row from a claims CSV export into the RawClaim shape.
 * Handles column name variations between Applied Epic and other exports.
 */
function csvRowToRawClaim(row: Record<string, string>): RawClaim {
  // Column aliases — add more here if your export uses different names
  return {
    Carrier:      col(row, ["Carrier", "carrier", "Insurance Company", "Insurer"]),
    Insured:      col(row, ["Insured", "insured", "Account Name", "AccountName", "Company"]),
    PolicyNumber: col(row, ["PolicyNumber", "Policy Number", "Policy #", "PolicyNum"]),
    PolicyYear:   colInt(row, ["PolicyYear", "Policy Year", "Year"]),
    ClaimNumber:  col(row, ["ClaimNumber", "Claim Number", "Claim #", "ClaimNum"]),
    DateOfLoss:   col(row, ["DateOfLoss", "Date of Loss", "Loss Date", "LossDate"]),
    Inception:    col(row, ["Inception", "inception", "Effective Date", "EffectiveDate", "Policy Start"]),
    Expiration:   col(row, ["Expiration", "expiration", "Expiry Date", "ExpirationDate", "Policy End"]),
    Status:       col(row, ["Status", "status", "Claim Status", "ClaimStatus"]),
    ClaimType:    col(row, ["ClaimType", "Claim Type", "Type", "LossType", "Loss Type"]),
    Line:         col(row, ["Line", "line", "Line of Business", "LOB", "Coverage"]),
    CauseOfLoss:  col(row, ["CauseOfLoss", "Cause of Loss", "Cause", "Reason"]),
    Category:     col(row, ["Category", "category", "Accident Category", "Loss Category"]),
    TotalPaid:    colFloat(row, ["TotalPaid", "Total Paid", "Paid", "PaidAmount", "Paid Amount"]),
    TotalReserve: colFloat(row, ["TotalReserve", "Total Reserve", "Reserve", "ReservedAmount", "Reserved Amount"]),
    TotalIncurred:colFloat(row, ["TotalIncurred", "Total Incurred", "Incurred", "IncurredAmount"]),
    Recovery:     colFloat(row, ["Recovery", "recovery", "Recoveries", "Subrogation"]),
    Deductible:   colFloat(row, ["Deductible", "deductible", "Ded"]),
    AccidentDesc: col(row, ["AccidentDesc", "Accident Description", "Description", "Desc", "Notes"]),
    Driver:       col(row, ["Driver", "driver", "Driver Name", "DriverName"]),
    Claimant:     col(row, ["Claimant", "claimant", "Claimant Name", "ClaimantName"]),
    State:        col(row, ["State", "state", "Loss State", "LossState"]),
    CloseDate:    col(row, ["CloseDate", "Close Date", "Closed Date", "ClosedDate", "Date Closed"]),
  };
}

function isCacheStale(): boolean {
  return !_raw || Date.now() - _rawLoadedAt > CACHE_TTL_MS;
}

function getRaw(): RawMasterData {
  if (!isCacheStale()) return _raw!;

  const cfg = getDataConfig();

  // ── Try CSV first ──────────────────────────────────────────────────────────
  if (cfg.claimsCSV) {
    try {
      const rows = parseCSV(cfg.claimsCSV);
      if (rows.length > 0) {
        const claims = rows.map(csvRowToRawClaim);
        _raw = {
          metadata: {
            generated: new Date().toISOString().slice(0, 10),
            totalClaims: claims.length,
            carriers: [...new Set(claims.map((c) => c.Carrier).filter(Boolean))],
            totalCompanies: new Set(claims.map((c) => c.Insured)).size,
            totalIncurred: claims.reduce((s, c) => s + (Number(c.TotalIncurred) || 0), 0),
          },
          claims,
        };
        _rawLoadedAt = Date.now();
        console.log(`[masterData] Loaded ${claims.length} claims from CSV: ${cfg.claimsCSV}`);
        // Bust derived caches so they rebuild from fresh claims
        bustDerivedCaches();
        return _raw;
      }
    } catch (err) {
      console.error(`[masterData] CSV load failed, falling back to JSON:`, err);
    }
  }

  // ── Fall back to embedded JSON ─────────────────────────────────────────────
  const filePath = path.join(process.cwd(), "swamp_fox_master_data.json");
  _raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as RawMasterData;
  _rawLoadedAt = Date.now();
  bustDerivedCaches();
  return _raw;
}

// ── Normalization ─────────────────────────────────────────────────────────────

function normalizeLine(line: string): "AL" | "GL" | "APD" {
  if (line === "AL" || line === "GL" || line === "APD") return line;
  return "AL";
}

function normalizeClaim(c: RawClaim): MasterClaim {
  return {
    carrier: c.Carrier ?? "",
    insured: c.Insured ?? "",
    policyNumber: c.PolicyNumber ?? "",
    policyYear: Number(c.PolicyYear) || 0,
    claimNumber: c.ClaimNumber ?? "",
    dateOfLoss: c.DateOfLoss ?? "",
    inception: c.Inception ?? "",
    expiration: c.Expiration ?? "",
    status: c.Status === "Open" ? "Open" : "Closed",
    claimType: c.ClaimType ?? "",
    line: normalizeLine(c.Line),
    causeOfLoss: c.CauseOfLoss ?? "",
    category: c.Category ?? "Other",
    totalPaid: Number(c.TotalPaid) || 0,
    totalReserve: Number(c.TotalReserve) || 0,
    totalIncurred: Number(c.TotalIncurred) || 0,
    recovery: Number(c.Recovery) || 0,
    deductible: Number(c.Deductible) || 0,
    accidentDesc: c.AccidentDesc ?? "",
    driver: c.Driver ?? "",
    claimant: c.Claimant ?? "",
    state: c.State ?? "",
    closeDate: c.CloseDate ?? "",
  };
}

function parseFloat2(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

// Derive a 0–100 risk score from available signals
function computeRiskScore(
  openClaims: number,
  totalIncurred: number,
  saferRating: string,
  vehicleOOSRate: number | null
): number {
  let score = 0;
  // Open claims: up to 40 pts (each open claim = 8 pts, capped)
  score += Math.min(openClaims * 8, 40);
  // Total incurred (log scale): up to 35 pts
  if (totalIncurred > 0) {
    score += Math.min(Math.log10(totalIncurred + 1) * 5, 35);
  }
  // SAFER: 15 pts for unsatisfactory, 8 for conditional
  if (saferRating === "Unsatisfactory") score += 15;
  else if (saferRating === "Conditional") score += 8;
  // Vehicle OOS rate: up to 10 pts
  if (vehicleOOSRate !== null) {
    if (vehicleOOSRate > 25) score += 10;
    else if (vehicleOOSRate > 15) score += 6;
    else if (vehicleOOSRate > 5) score += 3;
  }
  return Math.round(Math.min(score, 100));
}

// ── Cached computation ────────────────────────────────────────────────────────

let _claims: MasterClaim[] | null = null;
let _companies: Map<string, CompanySummary> | null = null;
let _portfolioKPIs: PortfolioKPIs | null = null;
let _portfolioCharts: PortfolioCharts | null = null;

/** Reset all derived caches (called automatically when raw data reloads). */
function bustDerivedCaches() {
  _claims = null;
  _companies = null;
  _portfolioKPIs = null;
  _portfolioCharts = null;
}

/**
 * Force an immediate reload of all data on next access.
 * Call from /api/reload to pick up new CSV files without restarting the server.
 */
export function bustMasterCache() {
  _raw = null;
  _rawLoadedAt = 0;
  bustDerivedCaches();
}

function getClaimsCache(): MasterClaim[] {
  if (!_claims) _claims = getRaw().claims.map(normalizeClaim);
  return _claims;
}

function getCompanyCache(): Map<string, CompanySummary> {
  if (_companies) return _companies;

  const claims = getClaimsCache();
  const rawCos = getRaw().companies ?? {};

  // Group claims by insured name
  const byInsured = new Map<string, MasterClaim[]>();
  for (const c of claims) {
    if (!byInsured.has(c.insured)) byInsured.set(c.insured, []);
    byInsured.get(c.insured)!.push(c);
  }

  _companies = new Map();

  for (const [name, co] of byInsured) {
    // Match company record by exact name or case-insensitive
    const rawRec: RawCompanyInfo | undefined =
      rawCos[name] ??
      Object.values(rawCos).find(
        (r) => r.name?.toLowerCase() === name.toLowerCase()
      );

    const openClaims = co.filter((c) => c.status === "Open").length;
    const totalIncurred = co.reduce((s, c) => s + c.totalIncurred, 0);
    const totalPaid = co.reduce((s, c) => s + c.totalPaid, 0);
    const totalReserved = co.reduce((s, c) => s + c.totalReserve, 0);

    const catCounts: Record<string, number> = {};
    const lineCounts: Record<string, number> = {};
    for (const c of co) {
      catCounts[c.category] = (catCounts[c.category] || 0) + 1;
      lineCounts[c.line] = (lineCounts[c.line] || 0) + 1;
    }
    const topCategory =
      Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const topLine =
      Object.entries(lineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    const carriers = [...new Set(co.map((c) => c.carrier))];
    const states = [...new Set(co.map((c) => c.state).filter(Boolean))];

    const sortedDates = co.map((c) => c.dateOfLoss).filter(Boolean).sort();
    const lastLossDate = sortedDates[sortedDates.length - 1] ?? "";
    const firstLossDate = sortedDates[0] ?? "";

    const vehicleOOSRate = parseFloat2(rawRec?.vehicleOOSRate);
    const driverOOSRate = parseFloat2(rawRec?.driverOOSRate);
    const saferRating = rawRec?.saferRating ?? "Unknown";

    _companies.set(name, {
      id: name,
      name,
      dot: rawRec?.dot ?? "",
      address: rawRec?.address ?? "",
      saferRating,
      operatingStatus: rawRec?.operatingStatus ?? "Unknown",
      vehicleInspections: rawRec?.vehicleInspections ?? 0,
      vehicleOOSRate,
      driverInspections: rawRec?.driverInspections ?? 0,
      driverOOSRate,
      totalClaims: co.length,
      openClaims,
      closedClaims: co.length - openClaims,
      totalIncurred,
      totalPaid,
      totalReserved,
      topCategory,
      topLine,
      carriers,
      states,
      lastLossDate,
      firstLossDate,
      riskScore: computeRiskScore(
        openClaims,
        totalIncurred,
        saferRating,
        vehicleOOSRate
      ),
    });
  }

  return _companies;
}

// ── Public accessors ──────────────────────────────────────────────────────────

/** All 822 normalized claims */
export function getMasterClaims(): MasterClaim[] {
  return getClaimsCache();
}

/** All 77 companies, sorted by risk score descending */
export function getMasterCompanies(): CompanySummary[] {
  return Array.from(getCompanyCache().values()).sort(
    (a, b) => b.riskScore - a.riskScore
  );
}

/** Single company with claims + chart aggregations */
export function getMasterCompanyByName(name: string): CompanyDetail | null {
  const summary = getCompanyCache().get(name);
  if (!summary) return null;

  const claims = getClaimsCache().filter((c) => c.insured === name);

  const yearMap = new Map<
    number,
    { count: number; incurred: number; paid: number; reserved: number }
  >();
  const catMap = new Map<string, { count: number; incurred: number }>();
  const lineMap = new Map<string, { count: number; incurred: number }>();

  for (const c of claims) {
    const year = new Date(c.dateOfLoss).getFullYear();
    if (!isNaN(year)) {
      const y = yearMap.get(year) ?? {
        count: 0, incurred: 0, paid: 0, reserved: 0,
      };
      y.count++;
      y.incurred += c.totalIncurred;
      y.paid += c.totalPaid;
      y.reserved += c.totalReserve;
      yearMap.set(year, y);
    }
    const cat = catMap.get(c.category) ?? { count: 0, incurred: 0 };
    cat.count++;
    cat.incurred += c.totalIncurred;
    catMap.set(c.category, cat);

    const ln = lineMap.get(c.line) ?? { count: 0, incurred: 0 };
    ln.count++;
    ln.incurred += c.totalIncurred;
    lineMap.set(c.line, ln);
  }

  return {
    ...summary,
    claims,
    claimsByYear: Array.from(yearMap.entries())
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => a.year - b.year),
    claimsByCategory: Array.from(catMap.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.incurred - a.incurred),
    claimsByLine: Array.from(lineMap.entries()).map(([line, v]) => ({
      line,
      ...v,
    })),
  };
}

/** Agency-wide KPI totals */
export function getMasterPortfolioKPIs(): PortfolioKPIs {
  if (_portfolioKPIs) return _portfolioKPIs;

  const claims = getClaimsCache();
  const companies = getMasterCompanies();
  const openClaims = claims.filter((c) => c.status === "Open").length;
  const totalIncurred = claims.reduce((s, c) => s + c.totalIncurred, 0);
  const totalPaid = claims.reduce((s, c) => s + c.totalPaid, 0);
  const totalReserved = claims.reduce((s, c) => s + c.totalReserve, 0);

  _portfolioKPIs = {
    totalClaims: claims.length,
    openClaims,
    closedClaims: claims.length - openClaims,
    totalIncurred,
    totalPaid,
    totalReserved,
    totalCompanies: companies.length,
    companiesWithOpenClaims: companies.filter((c) => c.openClaims > 0).length,
    avgClaimsPerCompany: Math.round(claims.length / companies.length),
    avgIncurredPerClaim: companies.length
      ? Math.round(totalIncurred / claims.length)
      : 0,
  };
  return _portfolioKPIs;
}

/** Aggregated chart data for the overview/portfolio page */
export function getMasterPortfolioCharts(): PortfolioCharts {
  if (_portfolioCharts) return _portfolioCharts;

  const claims = getClaimsCache();
  const yearMap = new Map<
    string,
    { incurred: number; paid: number; reserved: number; claims: number }
  >();
  const lineMap = new Map<string, { count: number; incurred: number }>();
  const carrierMap = new Map<string, { count: number; incurred: number }>();
  const catMap = new Map<string, { count: number; incurred: number }>();

  for (const c of claims) {
    const yr = c.dateOfLoss
      ? new Date(c.dateOfLoss).getFullYear().toString()
      : null;
    if (yr && yr !== "NaN") {
      const y = yearMap.get(yr) ?? {
        incurred: 0, paid: 0, reserved: 0, claims: 0,
      };
      y.incurred += c.totalIncurred;
      y.paid += c.totalPaid;
      y.reserved += c.totalReserve;
      y.claims++;
      yearMap.set(yr, y);
    }
    const l = lineMap.get(c.line) ?? { count: 0, incurred: 0 };
    l.count++;
    l.incurred += c.totalIncurred;
    lineMap.set(c.line, l);

    const cr = carrierMap.get(c.carrier) ?? { count: 0, incurred: 0 };
    cr.count++;
    cr.incurred += c.totalIncurred;
    carrierMap.set(c.carrier, cr);

    const cat = catMap.get(c.category) ?? { count: 0, incurred: 0 };
    cat.count++;
    cat.incurred += c.totalIncurred;
    catMap.set(c.category, cat);
  }

  _portfolioCharts = {
    incurredByYear: Array.from(yearMap.entries())
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => a.year.localeCompare(b.year)),
    claimsByLine: Array.from(lineMap.entries()).map(([line, v]) => ({
      line,
      ...v,
    })),
    claimsByCarrier: Array.from(carrierMap.entries()).map(([carrier, v]) => ({
      carrier,
      ...v,
    })),
    claimsByCategory: Array.from(catMap.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.incurred - a.incurred)
      .slice(0, 10),
    topByIncurred: getMasterCompanies()
      .sort((a, b) => b.totalIncurred - a.totalIncurred)
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        incurred: c.totalIncurred,
        openClaims: c.openClaims,
        totalClaims: c.totalClaims,
      })),
  };

  return _portfolioCharts;
}

/** Full-text search across companies and claims */
export function searchMaster(query: string): {
  companies: CompanySummary[];
  claims: MasterClaim[];
} {
  const q = query.toLowerCase();
  const companies = getMasterCompanies()
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.dot && c.dot.includes(q))
    )
    .slice(0, 8);

  const claims = getClaimsCache()
    .filter(
      (c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.insured.toLowerCase().includes(q) ||
        c.policyNumber.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    )
    .slice(0, 6);

  return { companies, claims };
}

/** Real computed risk alerts from data */
export interface RiskAlert {
  id: string;
  type: "open_claims" | "high_incurred" | "safer" | "oos_rate";
  severity: "high" | "medium" | "low";
  companyName: string;
  companyId: string;
  title: string;
  detail: string;
}

export function getMasterRiskAlerts(): RiskAlert[] {
  const companies = getMasterCompanies();
  const alerts: RiskAlert[] = [];

  for (const co of companies) {
    // Companies with 4+ open claims
    if (co.openClaims >= 4) {
      alerts.push({
        id: `open-${co.id}`,
        type: "open_claims",
        severity: "high",
        companyName: co.name,
        companyId: co.id,
        title: `${co.openClaims} open claims`,
        detail: `${co.name} has ${co.openClaims} open claims totaling $${(
          co.totalReserved / 1000
        ).toFixed(0)}K reserved.`,
      });
    } else if (co.openClaims >= 2) {
      alerts.push({
        id: `open-${co.id}`,
        type: "open_claims",
        severity: "medium",
        companyName: co.name,
        companyId: co.id,
        title: `${co.openClaims} open claims`,
        detail: `${co.name} has ${co.openClaims} open claims requiring follow-up.`,
      });
    }

    // Companies with $1M+ total incurred
    if (co.totalIncurred >= 1_000_000) {
      alerts.push({
        id: `incurred-${co.id}`,
        type: "high_incurred",
        severity: co.totalIncurred >= 2_000_000 ? "high" : "medium",
        companyName: co.name,
        companyId: co.id,
        title: `High total incurred — $${(co.totalIncurred / 1_000_000).toFixed(1)}M`,
        detail: `${co.name} has $${(
          co.totalIncurred / 1_000_000
        ).toFixed(2)}M in total incurred losses across ${co.totalClaims} claims.`,
      });
    }

    // SAFER concerns (non-standard ratings)
    if (
      co.saferRating &&
      co.saferRating !== "Unknown" &&
      co.saferRating !== "None" &&
      co.saferRating !== "Not Found" &&
      co.saferRating.toLowerCase().includes("conditional")
    ) {
      alerts.push({
        id: `safer-${co.id}`,
        type: "safer",
        severity: "medium",
        companyName: co.name,
        companyId: co.id,
        title: `SAFER: ${co.saferRating}`,
        detail: `${co.name} — DOT ${co.dot || "N/A"} has a non-satisfactory SAFER rating.`,
      });
    }

    // High vehicle OOS rate
    if (co.vehicleOOSRate !== null && co.vehicleOOSRate > 20) {
      alerts.push({
        id: `oos-${co.id}`,
        type: "oos_rate",
        severity: co.vehicleOOSRate > 30 ? "high" : "medium",
        companyName: co.name,
        companyId: co.id,
        title: `Vehicle OOS rate: ${co.vehicleOOSRate.toFixed(1)}%`,
        detail: `${co.name} has a ${co.vehicleOOSRate.toFixed(1)}% vehicle out-of-service rate (${co.vehicleInspections} inspections).`,
      });
    }
  }

  // Sort by severity
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

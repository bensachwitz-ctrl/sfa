// ─────────────────────────────────────────────────────────────────────────────
// Client-side data module — imports master JSON directly into the browser.
//
// This completely eliminates API round-trips through the slow WebContainer
// server. All aggregation runs in the browser's V8 engine — instant.
//
// When Microsoft Fabric is connected, this module is bypassed and
// API routes serve live SQL data instead.
// ─────────────────────────────────────────────────────────────────────────────

import RAW_DATA from "../swamp_fox_master_data.json";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  id: string;
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
  riskScore: number;
}

export interface CompanyDetail extends CompanySummary {
  claims: MasterClaim[];
  claimsByYear: { year: number; count: number; incurred: number; paid: number; reserved: number }[];
  claimsByCategory: { category: string; count: number; incurred: number }[];
  claimsByLine: { line: string; count: number; incurred: number }[];
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
  incurredByYear: { year: string; incurred: number; paid: number; reserved: number; claims: number }[];
  claimsByLine: { line: string; count: number; incurred: number }[];
  claimsByCarrier: { carrier: string; count: number; incurred: number }[];
  claimsByCategory: { category: string; count: number; incurred: number }[];
  topByIncurred: { name: string; incurred: number; openClaims: number; totalClaims: number }[];
}

export interface RiskAlert {
  id: string;
  type: "open_claims" | "high_incurred" | "safer" | "oos_rate" | "speeding" | "renewal";
  severity: "high" | "medium" | "low";
  companyName: string;
  companyId: string;
  title: string;
  detail: string;
}

// ── Normalise raw JSON ────────────────────────────────────────────────────────

function normLine(l: string): "AL" | "GL" | "APD" {
  if (l === "AL" || l === "GL" || l === "APD") return l;
  return "AL";
}

function toFloat(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function riskScore(openClaims: number, incurred: number, safer: string, vOOS: number | null) {
  let s = 0;
  s += Math.min(openClaims * 8, 40);
  if (incurred > 0) s += Math.min(Math.log10(incurred + 1) * 5, 35);
  if (safer.toLowerCase().includes("unsatisfactory")) s += 15;
  else if (safer.toLowerCase().includes("conditional")) s += 8;
  if (vOOS !== null) s += vOOS > 25 ? 10 : vOOS > 15 ? 6 : vOOS > 5 ? 3 : 0;
  return Math.round(Math.min(s, 100));
}

// ── Module-level cache (computed once, reused forever) ────────────────────────

let _claims: MasterClaim[] | null = null;
let _companies: Map<string, CompanySummary> | null = null;
let _portfolioKPIs: PortfolioKPIs | null = null;
let _portfolioCharts: PortfolioCharts | null = null;

function getClaims(): MasterClaim[] {
  if (_claims) return _claims;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _claims = (RAW_DATA.claims as any[]).map((c) => ({
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
    line: normLine(c.Line),
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
  }));
  return _claims;
}

function getCompanyMap(): Map<string, CompanySummary> {
  if (_companies) return _companies;
  const claims = getClaims();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCos: Record<string, any> = (RAW_DATA as any).companies ?? {};

  const byInsured = new Map<string, MasterClaim[]>();
  for (const c of claims) {
    if (!byInsured.has(c.insured)) byInsured.set(c.insured, []);
    byInsured.get(c.insured)!.push(c);
  }

  _companies = new Map();
  for (const [name, cos] of byInsured) {
    const raw = rawCos[name] ?? Object.values(rawCos).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.name?.toLowerCase() === name.toLowerCase()
    );
    const open = cos.filter((c) => c.status === "Open").length;
    const incurred = cos.reduce((s, c) => s + c.totalIncurred, 0);
    const paid = cos.reduce((s, c) => s + c.totalPaid, 0);
    const reserved = cos.reduce((s, c) => s + c.totalReserve, 0);

    const catC: Record<string, number> = {};
    const lineC: Record<string, number> = {};
    for (const c of cos) {
      catC[c.category] = (catC[c.category] || 0) + 1;
      lineC[c.line] = (lineC[c.line] || 0) + 1;
    }
    const topCat = Object.entries(catC).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const topLine = Object.entries(lineC).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const carriers = [...new Set(cos.map((c) => c.carrier))];
    const states = [...new Set(cos.map((c) => c.state).filter(Boolean))];
    const dates = cos.map((c) => c.dateOfLoss).filter(Boolean).sort();
    const vOOS = toFloat(raw?.vehicleOOSRate);
    const safer = raw?.saferRating ?? "Unknown";

    _companies.set(name, {
      id: name,
      name,
      dot: raw?.dot ?? "",
      address: raw?.address ?? "",
      saferRating: safer,
      operatingStatus: raw?.operatingStatus ?? "Unknown",
      vehicleInspections: raw?.vehicleInspections ?? 0,
      vehicleOOSRate: vOOS,
      driverInspections: raw?.driverInspections ?? 0,
      driverOOSRate: toFloat(raw?.driverOOSRate),
      totalClaims: cos.length,
      openClaims: open,
      closedClaims: cos.length - open,
      totalIncurred: incurred,
      totalPaid: paid,
      totalReserved: reserved,
      topCategory: topCat,
      topLine,
      carriers,
      states,
      lastLossDate: dates[dates.length - 1] ?? "",
      firstLossDate: dates[0] ?? "",
      riskScore: riskScore(open, incurred, safer, vOOS),
    });
  }
  return _companies;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCompanies(): CompanySummary[] {
  return Array.from(getCompanyMap().values()).sort((a, b) => b.riskScore - a.riskScore);
}

export function getCompanyByName(name: string): CompanyDetail | null {
  const summary = getCompanyMap().get(name);
  if (!summary) return null;
  const claims = getClaims().filter((c) => c.insured === name);

  const yearMap = new Map<number, { count: number; incurred: number; paid: number; reserved: number }>();
  const catMap = new Map<string, { count: number; incurred: number }>();
  const lineMap = new Map<string, { count: number; incurred: number }>();

  for (const c of claims) {
    const yr = new Date(c.dateOfLoss).getFullYear();
    if (!isNaN(yr)) {
      const y = yearMap.get(yr) ?? { count: 0, incurred: 0, paid: 0, reserved: 0 };
      y.count++; y.incurred += c.totalIncurred; y.paid += c.totalPaid; y.reserved += c.totalReserve;
      yearMap.set(yr, y);
    }
    const cat = catMap.get(c.category) ?? { count: 0, incurred: 0 };
    cat.count++; cat.incurred += c.totalIncurred; catMap.set(c.category, cat);
    const ln = lineMap.get(c.line) ?? { count: 0, incurred: 0 };
    ln.count++; ln.incurred += c.totalIncurred; lineMap.set(c.line, ln);
  }

  return {
    ...summary,
    claims,
    claimsByYear: Array.from(yearMap.entries()).map(([year, v]) => ({ year, ...v })).sort((a, b) => a.year - b.year),
    claimsByCategory: Array.from(catMap.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.incurred - a.incurred),
    claimsByLine: Array.from(lineMap.entries()).map(([line, v]) => ({ line, ...v })),
  };
}

export function getPortfolioKPIs(): PortfolioKPIs {
  if (_portfolioKPIs) return _portfolioKPIs;
  const claims = getClaims();
  const companies = getCompanies();
  const open = claims.filter((c) => c.status === "Open").length;
  const incurred = claims.reduce((s, c) => s + c.totalIncurred, 0);
  _portfolioKPIs = {
    totalClaims: claims.length,
    openClaims: open,
    closedClaims: claims.length - open,
    totalIncurred: incurred,
    totalPaid: claims.reduce((s, c) => s + c.totalPaid, 0),
    totalReserved: claims.reduce((s, c) => s + c.totalReserve, 0),
    totalCompanies: companies.length,
    companiesWithOpenClaims: companies.filter((c) => c.openClaims > 0).length,
    avgClaimsPerCompany: Math.round(claims.length / companies.length),
    avgIncurredPerClaim: Math.round(incurred / claims.length),
  };
  return _portfolioKPIs;
}

export function getPortfolioCharts(): PortfolioCharts {
  if (_portfolioCharts) return _portfolioCharts;
  const claims = getClaims();
  const yearMap = new Map<string, { incurred: number; paid: number; reserved: number; claims: number }>();
  const lineMap = new Map<string, { count: number; incurred: number }>();
  const carrierMap = new Map<string, { count: number; incurred: number }>();
  const catMap = new Map<string, { count: number; incurred: number }>();

  for (const c of claims) {
    const yr = c.dateOfLoss ? new Date(c.dateOfLoss).getFullYear().toString() : null;
    if (yr && yr !== "NaN") {
      const y = yearMap.get(yr) ?? { incurred: 0, paid: 0, reserved: 0, claims: 0 };
      y.incurred += c.totalIncurred; y.paid += c.totalPaid; y.reserved += c.totalReserve; y.claims++;
      yearMap.set(yr, y);
    }
    const l = lineMap.get(c.line) ?? { count: 0, incurred: 0 };
    l.count++; l.incurred += c.totalIncurred; lineMap.set(c.line, l);
    const cr = carrierMap.get(c.carrier) ?? { count: 0, incurred: 0 };
    cr.count++; cr.incurred += c.totalIncurred; carrierMap.set(c.carrier, cr);
    const cat = catMap.get(c.category) ?? { count: 0, incurred: 0 };
    cat.count++; cat.incurred += c.totalIncurred; catMap.set(c.category, cat);
  }

  _portfolioCharts = {
    incurredByYear: Array.from(yearMap.entries()).map(([year, v]) => ({ year, ...v })).sort((a, b) => a.year.localeCompare(b.year)),
    claimsByLine: Array.from(lineMap.entries()).map(([line, v]) => ({ line, ...v })),
    claimsByCarrier: Array.from(carrierMap.entries()).map(([carrier, v]) => ({ carrier, ...v })),
    claimsByCategory: Array.from(catMap.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.incurred - a.incurred).slice(0, 10),
    topByIncurred: getCompanies().sort((a, b) => b.totalIncurred - a.totalIncurred).slice(0, 10).map((c) => ({
      name: c.name, incurred: c.totalIncurred, openClaims: c.openClaims, totalClaims: c.totalClaims,
    })),
  };
  return _portfolioCharts;
}

export function getFilteredClaims(opts: {
  q?: string; status?: string; line?: string; carrier?: string;
  category?: string; state?: string; companies?: string[];
  dateFrom?: string; dateTo?: string;
  page?: number; pageSize?: number;
}) {
  let claims = getClaims();
  const { q = "", status = "All", line = "All", carrier = "All",
    category = "All", state = "All", companies = [],
    dateFrom = "", dateTo = "",
    page = 1, pageSize = 50 } = opts;

  if (companies.length > 0) claims = claims.filter((c) => companies.includes(c.insured));
  if (status !== "All") claims = claims.filter((c) => c.status === status);
  if (line !== "All") claims = claims.filter((c) => c.line === line);
  if (carrier !== "All") claims = claims.filter((c) => c.carrier === carrier);
  if (category !== "All") claims = claims.filter((c) => c.category === category);
  if (state !== "All") claims = claims.filter((c) => c.state === state);
  if (dateFrom) claims = claims.filter((c) => c.dateOfLoss >= dateFrom);
  if (dateTo)   claims = claims.filter((c) => c.dateOfLoss <= dateTo);
  if (q) {
    const qLow = q.toLowerCase();
    claims = claims.filter((c) =>
      c.claimNumber.toLowerCase().includes(qLow) ||
      c.insured.toLowerCase().includes(qLow) ||
      c.policyNumber.toLowerCase().includes(qLow) ||
      c.driver.toLowerCase().includes(qLow) ||
      c.accidentDesc.toLowerCase().includes(qLow)
    );
  }

  claims = claims.sort((a, b) => {
    if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
    return b.dateOfLoss.localeCompare(a.dateOfLoss);
  });

  const total = claims.length;
  const totalIncurred = claims.reduce((s, c) => s + c.totalIncurred, 0);
  const totalPaid = claims.reduce((s, c) => s + c.totalPaid, 0);
  const totalReserved = claims.reduce((s, c) => s + c.totalReserve, 0);
  const openCount = claims.filter((c) => c.status === "Open").length;

  return {
    claims: claims.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    summary: { totalIncurred, totalPaid, totalReserved, openCount, closedCount: total - openCount },
  };
}

export function getRiskAlerts(): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  for (const co of getCompanies()) {
    if (co.openClaims >= 4) {
      alerts.push({ id: `open-${co.id}`, type: "open_claims", severity: "high", companyName: co.name, companyId: co.id,
        title: `${co.openClaims} open claims`, detail: `${co.name} has ${co.openClaims} open claims totaling $${(co.totalReserved / 1000).toFixed(0)}K reserved.` });
    } else if (co.openClaims >= 2) {
      alerts.push({ id: `open-${co.id}`, type: "open_claims", severity: "medium", companyName: co.name, companyId: co.id,
        title: `${co.openClaims} open claims`, detail: `${co.name} has ${co.openClaims} open claims requiring follow-up.` });
    }
    if (co.totalIncurred >= 1_000_000) {
      alerts.push({ id: `inc-${co.id}`, type: "high_incurred", severity: co.totalIncurred >= 2_000_000 ? "high" : "medium",
        companyName: co.name, companyId: co.id, title: `High incurred — $${(co.totalIncurred / 1_000_000).toFixed(1)}M`,
        detail: `${co.name} has $${(co.totalIncurred / 1_000_000).toFixed(2)}M across ${co.totalClaims} claims.` });
    }
    if (co.saferRating?.toLowerCase().includes("conditional")) {
      alerts.push({ id: `safer-${co.id}`, type: "safer", severity: "medium", companyName: co.name, companyId: co.id,
        title: `SAFER: ${co.saferRating}`, detail: `${co.name} — DOT ${co.dot || "N/A"} has a conditional SAFER rating.` });
    }
    if (co.vehicleOOSRate !== null && (co.vehicleOOSRate ?? 0) > 20) {
      alerts.push({ id: `oos-${co.id}`, type: "oos_rate", severity: (co.vehicleOOSRate ?? 0) > 30 ? "high" : "medium",
        companyName: co.name, companyId: co.id, title: `Vehicle OOS: ${co.vehicleOOSRate?.toFixed(1)}%`,
        detail: `${co.name} has a ${co.vehicleOOSRate?.toFixed(1)}% vehicle out-of-service rate.` });
    }
  }
  // ── Renewal alerts ──
  for (const r of getRenewals()) {
    if (r.urgency === "overdue" || r.urgency === "critical") {
      alerts.push({
        id: `renewal-${r.id}`,
        type: "renewal",
        severity: r.urgency === "overdue" ? "high" : "medium",
        companyName: r.company,
        companyId: r.company,
        title: r.urgency === "overdue"
          ? `Policy overdue — ${Math.abs(r.daysUntilRenewal)}d past expiration`
          : `Renewal due in ${r.daysUntilRenewal} days`,
        detail: `${r.company} — ${r.line} policy #${r.policyNumber} (${r.carrier}) expires ${r.expiration}.`,
      });
    }
  }

  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ── Renewals ──────────────────────────────────────────────────────────────────

export interface PolicyRenewal {
  id: string;
  company: string;
  policyNumber: string;
  carrier: string;
  line: string;
  inception: string;       // original policy start
  expiration: string;      // renewal date (expiration of current term)
  daysUntilRenewal: number;
  urgency: "overdue" | "critical" | "soon" | "upcoming";  // <0 | 0-30 | 31-60 | 61-90
  totalIncurred: number;
  openClaims: number;
  riskScore: number;
}

export function getRenewals(): PolicyRenewal[] {
  const today = new Date("2026-04-08");
  const seen = new Set<string>();
  const renewals: PolicyRenewal[] = [];

  // Dedupe by policy number — take the latest expiration per policy
  const policyMap = new Map<string, typeof renewals[0] & { _exp: Date }>();

  for (const c of getClaims()) {
    if (!c.expiration || !c.policyNumber) continue;
    const expDate = new Date(c.expiration);
    if (isNaN(expDate.getTime())) continue;
    const key = `${c.insured}|${c.policyNumber}`;
    const existing = policyMap.get(key);
    if (!existing || expDate > existing._exp) {
      const days = Math.round((expDate.getTime() - today.getTime()) / 86_400_000);
      const urgency: PolicyRenewal["urgency"] =
        days < 0  ? "overdue" :
        days <= 30 ? "critical" :
        days <= 60 ? "soon" : "upcoming";
      const co = getCompanyMap().get(c.insured);
      policyMap.set(key, {
        id: key,
        company: c.insured,
        policyNumber: c.policyNumber,
        carrier: c.carrier,
        line: c.line,
        inception: c.inception,
        expiration: c.expiration,
        daysUntilRenewal: days,
        urgency,
        totalIncurred: co?.totalIncurred ?? 0,
        openClaims: co?.openClaims ?? 0,
        riskScore: co?.riskScore ?? 0,
        _exp: expDate,
      });
    }
  }

  for (const r of policyMap.values()) {
    // Only show renewals within 90 days or overdue (not expired long ago)
    if (r.daysUntilRenewal >= -30 && r.daysUntilRenewal <= 90) {
      const { _exp, ...clean } = r; void _exp;
      if (!seen.has(r.id)) { seen.add(r.id); renewals.push(clean); }
    }
  }

  return renewals.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
}

// ── Loss Exposure ─────────────────────────────────────────────────────────────

export interface CompanyExposure {
  company: string;
  carrier: string;
  line: string;
  openClaims: number;
  openReserves: number;
  totalIncurred: number;
  totalPaid: number;
  riskScore: number;
  // Estimated premium based on $25K avg per policy (placeholder until Fabric)
  estimatedPremium: number;
  lossRatioPct: number;
}

export function getLossExposure(): {
  portfolio: {
    totalOpenReserves: number;
    totalIncurred: number;
    totalPaid: number;
    openClaimsCount: number;
    estimatedPremium: number;
    lossRatioPct: number;
    byCarrier: { carrier: string; openReserves: number; incurred: number; openClaims: number }[];
    byLine: { line: string; openReserves: number; incurred: number; openClaims: number }[];
  };
  companies: CompanyExposure[];
} {
  const companies = getCompanies();
  const claims = getClaims();

  const openClaims = claims.filter((c) => c.status === "Open");
  const totalOpenReserves = openClaims.reduce((s, c) => s + c.totalReserve, 0);
  const totalIncurred = claims.reduce((s, c) => s + c.totalIncurred, 0);
  const totalPaid = claims.reduce((s, c) => s + c.totalPaid, 0);

  // $25K estimated avg premium per policy-year as placeholder
  const uniquePolicies = new Set(claims.map((c) => c.policyNumber)).size;
  const estimatedPremium = uniquePolicies * 25_000;
  const lossRatioPct = estimatedPremium > 0 ? Math.round((totalIncurred / estimatedPremium) * 100) : 0;

  const carrierMap = new Map<string, { openReserves: number; incurred: number; openClaims: number }>();
  const lineMap    = new Map<string, { openReserves: number; incurred: number; openClaims: number }>();
  for (const c of claims) {
    const cr = carrierMap.get(c.carrier) ?? { openReserves: 0, incurred: 0, openClaims: 0 };
    cr.incurred += c.totalIncurred;
    if (c.status === "Open") { cr.openReserves += c.totalReserve; cr.openClaims++; }
    carrierMap.set(c.carrier, cr);

    const ln = lineMap.get(c.line) ?? { openReserves: 0, incurred: 0, openClaims: 0 };
    ln.incurred += c.totalIncurred;
    if (c.status === "Open") { ln.openReserves += c.totalReserve; ln.openClaims++; }
    lineMap.set(c.line, ln);
  }

  const companyExposure: CompanyExposure[] = companies.map((co) => {
    const coClaims = claims.filter((c) => c.insured === co.name);
    const policies = new Set(coClaims.map((c) => c.policyNumber)).size;
    const est = policies * 25_000;
    return {
      company: co.name,
      carrier: co.carriers[0] ?? "—",
      line: co.topLine,
      openClaims: co.openClaims,
      openReserves: co.totalReserved,
      totalIncurred: co.totalIncurred,
      totalPaid: co.totalPaid,
      riskScore: co.riskScore,
      estimatedPremium: est,
      lossRatioPct: est > 0 ? Math.round((co.totalIncurred / est) * 100) : 0,
    };
  });

  return {
    portfolio: {
      totalOpenReserves,
      totalIncurred,
      totalPaid,
      openClaimsCount: openClaims.length,
      estimatedPremium,
      lossRatioPct,
      byCarrier: [...carrierMap.entries()].map(([carrier, v]) => ({ carrier, ...v })).sort((a, b) => b.incurred - a.incurred),
      byLine:    [...lineMap.entries()].map(([line, v]) => ({ line, ...v })).sort((a, b) => b.incurred - a.incurred),
    },
    companies: companyExposure.sort((a, b) => b.openReserves - a.openReserves),
  };
}

export function getClaimsByState(): { state: string; count: number; incurred: number; paid: number }[] {
  const stateMap = new Map<string, { count: number; incurred: number; paid: number }>();
  for (const c of getClaims()) {
    if (!c.state) continue;
    const s = stateMap.get(c.state) ?? { count: 0, incurred: 0, paid: 0 };
    s.count++; s.incurred += c.totalIncurred; s.paid += c.totalPaid;
    stateMap.set(c.state, s);
  }
  return Array.from(stateMap.entries())
    .map(([state, v]) => ({ state, ...v }))
    .sort((a, b) => b.incurred - a.incurred);
}

// ── Policies ──────────────────────────────────────────────────────────────────

export interface PolicyRecord {
  id: string;           // `${insured}|${policyNumber}`
  company: string;
  policyNumber: string;
  carrier: string;
  line: "AL" | "GL" | "APD";
  inception: string;
  expiration: string;
  status: "Active" | "Expired" | "Overdue";
  daysUntilExpiration: number;
  totalClaims: number;
  openClaims: number;
  totalIncurred: number;
  totalPaid: number;
  totalReserved: number;
  riskScore: number;
}

export function getPolicies(): PolicyRecord[] {
  const today = new Date("2026-04-08");
  const policyMap = new Map<string, PolicyRecord>();

  for (const c of getClaims()) {
    if (!c.policyNumber) continue;
    const key = `${c.insured}|${c.policyNumber}`;
    if (!policyMap.has(key)) {
      const expDate = c.expiration ? new Date(c.expiration) : null;
      const days = expDate && !isNaN(expDate.getTime())
        ? Math.round((expDate.getTime() - today.getTime()) / 86_400_000)
        : 9999;
      const status: PolicyRecord["status"] =
        !expDate || isNaN(expDate.getTime()) ? "Active" :
        days < -60 ? "Expired" :
        days < 0   ? "Overdue" : "Active";
      const co = getCompanyMap().get(c.insured);
      policyMap.set(key, {
        id: key,
        company: c.insured,
        policyNumber: c.policyNumber,
        carrier: c.carrier,
        line: c.line,
        inception: c.inception,
        expiration: c.expiration,
        status,
        daysUntilExpiration: days,
        totalClaims: 0,
        openClaims: 0,
        totalIncurred: 0,
        totalPaid: 0,
        totalReserved: 0,
        riskScore: co?.riskScore ?? 0,
      });
    }
    const p = policyMap.get(key)!;
    p.totalClaims++;
    if (c.status === "Open") p.openClaims++;
    p.totalIncurred += c.totalIncurred;
    p.totalPaid     += c.totalPaid;
    p.totalReserved += c.totalReserve;
    // Keep latest expiration if multiple claims on same policy
    if (c.expiration && c.expiration > p.expiration) {
      p.expiration = c.expiration;
      const expDate = new Date(c.expiration);
      if (!isNaN(expDate.getTime())) {
        p.daysUntilExpiration = Math.round((expDate.getTime() - today.getTime()) / 86_400_000);
        p.status =
          p.daysUntilExpiration < -60 ? "Expired" :
          p.daysUntilExpiration < 0   ? "Overdue" : "Active";
      }
    }
  }

  return Array.from(policyMap.values()).sort((a, b) => {
    // Active with open claims first, then by expiration proximity
    if (a.openClaims !== b.openClaims) return b.openClaims - a.openClaims;
    return a.daysUntilExpiration - b.daysUntilExpiration;
  });
}

export function searchData(query: string) {
  const q = query.toLowerCase();
  return {
    companies: getCompanies().filter((c) => c.name.toLowerCase().includes(q) || c.dot.includes(q)).slice(0, 8),
    claims: getClaims().filter((c) =>
      c.claimNumber.toLowerCase().includes(q) || c.insured.toLowerCase().includes(q) || c.policyNumber.toLowerCase().includes(q)
    ).slice(0, 6),
  };
}

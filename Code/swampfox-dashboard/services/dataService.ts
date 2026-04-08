// ─────────────────────────────────────────────────────────────────────────────
// Data Service Layer — all data fetching flows through here.
// Replace the fetch() calls with Fabric API calls when ready;
// the UI components never import from lib/mockData directly.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Company,
  Policy,
  Claim,
  Driver,
  ClaimsTrendPoint,
  LossRatioPoint,
  SamsaraEventPoint,
  PremiumVsLossesPoint,
} from "@/lib/mockData";

export type { Company, Policy, Claim, Driver };

// ── Search result types ───────────────────────────────────────────────────────

export interface SearchResultItem {
  type: "company" | "policy" | "claim";
  id: string;            // unique identifier for keying
  label: string;         // primary display text
  sublabel: string;      // secondary display text
  accountCode: string;   // parent company account code (used to hydrate Company on select)
  accountName: string;   // parent company name
  dotNumber?: string;    // only on company results
}

export interface SearchResults {
  companies: SearchResultItem[];
  policies: SearchResultItem[];
  claims: SearchResultItem[];
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

export async function fetchKPIs(): Promise<{
  totalActivePolicies: number;
  openClaims: number;
  atRiskDrivers: number;
  renewalsDue30d: number;
}> {
  const res = await fetch("/api/kpis");
  if (!res.ok) throw new Error("Failed to fetch KPIs");
  return res.json();
}

// ── Companies ─────────────────────────────────────────────────────────────────

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch("/api/companies");
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

export async function fetchCompanyById(id: string): Promise<{
  company: Company;
  policies: Policy[];
  claims: Claim[];
  drivers: Driver[];
  claimsTrend: ClaimsTrendPoint[];
  lossRatio: LossRatioPoint[];
  samsaraEvents: SamsaraEventPoint[];
  premiumVsLosses: PremiumVsLossesPoint[];
}> {
  const res = await fetch(`/api/companies/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch company ${id}`);
  return res.json();
}

// ── Global Search ──────────────────────────────────────────────────────────────

export async function searchEntities(query: string): Promise<SearchResults> {
  if (query.trim().length < 2) {
    return { companies: [], policies: [], claims: [] };
  }
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(query.trim())}`
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

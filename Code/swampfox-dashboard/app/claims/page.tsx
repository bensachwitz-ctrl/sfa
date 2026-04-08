"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { getFilteredClaims, getPortfolioCharts, getClaimsByState } from "@/lib/clientData";
import {
  FileText, Search, ChevronDown, ChevronRight,
  DollarSign, AlertCircle, CheckCircle2, Building2,
  Filter, X, Calendar,
} from "lucide-react";
import clsx from "clsx";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

const STATUS_STYLES: Record<string, string> = {
  Open:   "text-red-700 bg-red-50 border-red-200",
  Closed: "text-ink-mid bg-cream-hover border-cream-border",
};

const LINE_STYLES: Record<string, string> = {
  AL:  "text-forest bg-forest/10 border-forest/30",
  GL:  "text-violet-700 bg-violet-50 border-violet-200",
  APD: "text-orange-700 bg-orange-50 border-orange-200",
};

interface CompanyGroup {
  name: string;
  claims: ReturnType<typeof getFilteredClaims>["claims"];
  totalIncurred: number;
  totalPaid: number;
  totalReserved: number;
  openCount: number;
}

export default function ClaimsPage() {
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("All");
  const [line, setLine]           = useState("All");
  const [carrier, setCarrier]     = useState("All");
  const [category, setCategory]   = useState("All");
  const [state, setState]         = useState("All");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [page, setPage]           = useState(1);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const charts = useMemo(() => getPortfolioCharts(), []);
  const categories = useMemo(
    () => charts.claimsByCategory.map((c) => c.category).filter(Boolean),
    [charts]
  );
  const states = useMemo(
    () => getClaimsByState().map((s) => s.state).filter(Boolean).sort(),
    []
  );

  const data = useMemo(
    () => getFilteredClaims({ q: search, status, line, carrier, category, state, dateFrom, dateTo, page, pageSize: 200 }),
    [search, status, line, carrier, category, state, dateFrom, dateTo, page]
  );

  const grouped = useMemo<CompanyGroup[]>(() => {
    const map = new Map<string, CompanyGroup>();
    for (const c of data.claims) {
      if (!map.has(c.insured)) {
        map.set(c.insured, { name: c.insured, claims: [], totalIncurred: 0, totalPaid: 0, totalReserved: 0, openCount: 0 });
      }
      const g = map.get(c.insured)!;
      g.claims.push(c);
      g.totalIncurred += c.totalIncurred;
      g.totalPaid     += c.totalPaid;
      g.totalReserved += c.totalReserve;
      if (c.status === "Open") g.openCount++;
    }
    return Array.from(map.values()).sort((a, b) => b.openCount - a.openCount || b.totalIncurred - a.totalIncurred);
  }, [data.claims]);

  function toggleCompany(name: string) {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const hasFilters = search || status !== "All" || line !== "All" || carrier !== "All" || category !== "All" || state !== "All" || dateFrom || dateTo;

  function clearFilters() {
    setSearch(""); setStatus("All"); setLine("All"); setCarrier("All");
    setCategory("All"); setState("All");
    setDateFrom(""); setDateTo(""); setPage(1);
  }

  return (
    <>
      <TopBar
        title="Claims"
        subtitle={`${data.pagination.total.toLocaleString()} claims · grouped by insured company`}
      />

      <main className="page-body space-y-5">
        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Filtered Claims"  value={data.pagination.total.toLocaleString()}
            subtext="Matching current filters" icon={FileText} variant="default" />
          <StatCard label="Open Claims"      value={data.summary.openCount}
            subtext="Require action" icon={AlertCircle} variant="warning" />
          <StatCard label="Total Incurred"   value={fmt(data.summary.totalIncurred)}
            subtext="Paid + reserved" icon={DollarSign} variant="default" />
          <StatCard label="Open Reserves"    value={fmt(data.summary.totalReserved)}
            subtext="Active claim reserves" icon={CheckCircle2}
            variant={data.summary.totalReserved > 500_000 ? "warning" : "default"} />
        </div>

        {/* ── Filters ── */}
        <div className="card-padded space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-ink-muted shrink-0" />

            {/* Search */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="text" placeholder="Claim #, company, driver…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-9 text-xs py-2" />
            </div>

            <div className="h-4 w-px bg-cream-border hidden sm:block" />

            {/* Status pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "Open", "Closed"].map((s) => (
                <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                  className={clsx("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    status === s ? "pill-active" : "pill-inactive")}>
                  {s}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-cream-border hidden sm:block" />

            {/* Line of business */}
            <div className="relative">
              <select value={line} onChange={(e) => { setLine(e.target.value); setPage(1); }}
                className="form-select">
                <option value="All">All Lines</option>
                <option value="AL">Auto Liability</option>
                <option value="GL">General Liability</option>
                <option value="APD">Auto Physical Damage</option>
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Carrier */}
            <div className="relative">
              <select value={carrier} onChange={(e) => { setCarrier(e.target.value); setPage(1); }}
                className="form-select">
                <option value="All">All Carriers</option>
                <option value="Accredited">Accredited</option>
                <option value="FICoSE">FICoSE</option>
                <option value="SFP">SFP</option>
                <option value="Lloyds">Lloyds</option>
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Category */}
            <div className="relative">
              <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="form-select">
                <option value="All">All Categories</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* State */}
            <div className="relative">
              <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}
                className="form-select">
                <option value="All">All States</option>
                {states.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-ink-muted hover:text-red-600 text-xs transition-colors ml-auto">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          {/* Date range row */}
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-ink-muted shrink-0" />
            <span className="text-ink-muted text-xs">Date of Loss:</span>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="form-input text-xs py-1.5 w-36" />
              <span className="text-ink-muted text-xs">to</span>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="form-input text-xs py-1.5 w-36" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-ink-muted hover:text-red-600 text-xs transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
            <span className="text-ink-faint text-xs ml-auto hidden lg:block">
              {data.pagination.total} claims · {grouped.length} companies
            </span>
          </div>
        </div>

        {/* ── Company Groups ── */}
        {grouped.length === 0 ? (
          <div className="card-padded text-center text-ink-muted py-10">
            No claims match the current filters.
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map((g) => {
              const expanded = expandedCompanies.has(g.name);
              return (
                <div key={g.name} className="card overflow-hidden">
                  <button
                    onClick={() => toggleCompany(g.name)}
                    className={clsx(
                      "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-cream-hover transition-colors",
                      expanded && "bg-cream-hover"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-forest" />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-ink font-semibold text-sm truncate">{g.name}</p>
                      <p className="text-ink-muted text-xs mt-0.5">
                        {g.claims.length} claim{g.claims.length !== 1 ? "s" : ""}{" · "}{g.claims[0]?.carrier ?? ""}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-ink-muted text-[10px]">Incurred</p>
                        <p className="text-ink text-sm font-semibold">{fmt(g.totalIncurred)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-ink-muted text-[10px]">Paid</p>
                        <p className="text-forest text-sm font-semibold">{fmt(g.totalPaid)}</p>
                      </div>
                      {g.totalReserved > 0 && (
                        <div className="text-right">
                          <p className="text-ink-muted text-[10px]">Reserved</p>
                          <p className="text-amber-700 text-sm font-semibold">{fmt(g.totalReserved)}</p>
                        </div>
                      )}
                      {g.openCount > 0 ? (
                        <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                          {g.openCount} open
                        </span>
                      ) : (
                        <span className="text-xs bg-cream-hover text-ink-muted border border-cream-border px-2 py-0.5 rounded-full">
                          All closed
                        </span>
                      )}
                    </div>

                    <ChevronRight className={clsx("w-4 h-4 text-ink-muted transition-transform shrink-0",
                      expanded && "rotate-90 text-forest")} />
                  </button>

                  {expanded && (
                    <div className="border-t border-cream-border overflow-x-auto">
                      <table className="w-full text-sm min-w-[800px]">
                        <thead>
                          <tr className="border-b border-cream-border bg-cream-hover">
                            {["Claim #", "Policy #", "Line", "Category", "Date of Loss", "State", "Status", "Paid", "Reserved", "Incurred"].map((h) => (
                              <th key={h} className="text-left text-ink-muted text-[11px] font-medium px-4 py-2.5">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.claims.map((c, i) => (
                            <tr key={c.claimNumber} className={clsx(
                              "border-b border-cream-border/60 hover:bg-cream-hover transition-colors",
                              i === g.claims.length - 1 && "border-0",
                              c.status === "Open" && "bg-red-50/40"
                            )}>
                              <td className="px-4 py-2.5 font-mono text-xs text-ink-mid">{c.claimNumber}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">{c.policyNumber}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LINE_STYLES[c.line] ?? ""}`}>{c.line}</span>
                              </td>
                              <td className="px-4 py-2.5 text-ink-mid text-xs max-w-[140px] truncate" title={c.category}>{c.category}</td>
                              <td className="px-4 py-2.5 text-ink-muted text-xs">{c.dateOfLoss}</td>
                              <td className="px-4 py-2.5 text-ink-muted text-xs">{c.state}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[c.status] ?? ""}`}>{c.status}</span>
                              </td>
                              <td className="px-4 py-2.5 text-ink text-xs font-medium">{c.totalPaid > 0 ? fmt(c.totalPaid) : "—"}</td>
                              <td className="px-4 py-2.5 text-amber-700 text-xs font-medium">{c.totalReserve > 0 ? fmt(c.totalReserve) : "—"}</td>
                              <td className="px-4 py-2.5 text-ink text-xs font-semibold">{c.totalIncurred > 0 ? fmt(c.totalIncurred) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-cream-border bg-cream-hover">
                            <td colSpan={7} className="px-4 py-2 text-ink-mid text-xs font-medium">{g.claims.length} claims</td>
                            <td className="px-4 py-2 text-ink text-xs font-semibold">{fmt(g.totalPaid)}</td>
                            <td className="px-4 py-2 text-amber-700 text-xs font-semibold">{g.totalReserved > 0 ? fmt(g.totalReserved) : "—"}</td>
                            <td className="px-4 py-2 text-orange-700 text-xs font-bold">{fmt(g.totalIncurred)}</td>
                          </tr>
                        </tfoot>
                      </table>

                      {g.claims.some((c) => c.status === "Open" && c.accidentDesc) && (
                        <div className="px-4 pb-3 pt-2 border-t border-cream-border bg-red-50/30">
                          <p className="text-red-700 text-[10px] uppercase tracking-wider mb-2 font-medium">Open claim notes</p>
                          <div className="space-y-1.5">
                            {g.claims.filter((c) => c.status === "Open" && c.accidentDesc).map((c) => (
                              <div key={c.claimNumber} className="flex gap-2 text-xs">
                                <span className="font-mono text-ink-muted shrink-0">{c.claimNumber}</span>
                                <span className="text-ink-mid">{c.accidentDesc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-cream-hover text-ink-mid hover:bg-cream-border disabled:opacity-40 transition-colors border border-cream-border">
              ← Prev
            </button>
            <span className="text-ink-muted text-xs">
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} claims
            </span>
            <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-cream-hover text-ink-mid hover:bg-cream-border disabled:opacity-40 transition-colors border border-cream-border">
              Next →
            </button>
          </div>
        )}
      </main>
    </>
  );
}

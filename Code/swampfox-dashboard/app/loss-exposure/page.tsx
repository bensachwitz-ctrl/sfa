"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { getLossExposure, CompanyExposure } from "@/lib/clientData";
import {
  TrendingUp, DollarSign, AlertCircle, Shield,
  ChevronRight, Building2, Search, X, ArrowUpDown,
  Info,
} from "lucide-react";
import clsx from "clsx";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function LossRatioBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : pct >= 60 ? "bg-yellow-500" : "bg-forest-light";
  const textColor = pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : pct >= 60 ? "text-yellow-600" : "text-forest";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-cream-hover rounded-full h-1.5 w-20">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={clsx("text-xs font-bold tabular-nums w-10 text-right", textColor)}>
        {pct}%
      </span>
    </div>
  );
}

type SortKey = "reserves" | "incurred" | "lossRatio" | "openClaims" | "name";

export default function LossExposurePage() {
  const router = useRouter();
  const [search,     setSearch]     = useState("");
  const [filterLine, setFilterLine] = useState("All");
  const [filterCarrier, setFilterCarrier] = useState("All");
  const [sortBy,     setSortBy]     = useState<SortKey>("reserves");
  const [showNote,   setShowNote]   = useState(false);

  const { portfolio, companies } = useMemo(() => getLossExposure(), []);

  const carriers = [...new Set(companies.map((c) => c.carrier))].sort();

  const filtered = useMemo(() =>
    companies
      .filter((c) => {
        if (filterLine !== "All"    && c.line    !== filterLine)    return false;
        if (filterCarrier !== "All" && c.carrier !== filterCarrier) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!c.company.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "reserves")   return b.openReserves - a.openReserves;
        if (sortBy === "incurred")   return b.totalIncurred - a.totalIncurred;
        if (sortBy === "lossRatio")  return b.lossRatioPct - a.lossRatioPct;
        if (sortBy === "openClaims") return b.openClaims - a.openClaims;
        return a.company.localeCompare(b.company);
      }),
    [companies, filterLine, filterCarrier, search, sortBy]
  );

  const LINE_NAMES: Record<string, string> = { AL: "Auto Liability", GL: "General Liability", APD: "Auto Physical Damage" };

  return (
    <>
      <TopBar
        title="Loss Exposure"
        subtitle="Open reserves, incurred losses, and estimated loss ratios by company and carrier"
      />

      <main className="page-body space-y-6">
        {/* ── Portfolio KPIs ── */}
        <section>
          <h2 className="section-header flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-forest" /> Portfolio Exposure Summary
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Open Reserves"   value={fmt(portfolio.totalOpenReserves)}
              subtext="Active open claim reserves" icon={AlertCircle}
              variant={portfolio.totalOpenReserves > 2_000_000 ? "danger" : "warning"} />
            <StatCard label="Total Incurred (All Time)" value={fmt(portfolio.totalIncurred)}
              subtext="Paid + reserved · all years" icon={DollarSign} variant="default" />
            <StatCard label="Est. Portfolio Loss Ratio" value={`${portfolio.lossRatioPct}%`}
              subtext="Incurred vs. estimated premium" icon={TrendingUp}
              variant={portfolio.lossRatioPct >= 100 ? "danger" : portfolio.lossRatioPct >= 80 ? "warning" : "success"} />
            <StatCard label="Open Claims"            value={portfolio.openClaimsCount}
              subtext="Across all companies" icon={Shield}
              variant={portfolio.openClaimsCount > 50 ? "warning" : "default"} />
          </div>
        </section>

        {/* ── Carrier + Line breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-padded">
            <p className="text-ink font-semibold text-sm mb-4">Exposure by Carrier</p>
            <div className="space-y-3">
              {portfolio.byCarrier.map((c) => {
                const pct = portfolio.totalIncurred > 0 ? Math.round((c.incurred / portfolio.totalIncurred) * 100) : 0;
                return (
                  <div key={c.carrier}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-ink text-sm font-medium">{c.carrier}</span>
                        {c.openClaims > 0 && (
                          <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                            {c.openClaims} open
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-ink text-xs font-semibold">{fmt(c.incurred)}</span>
                        <span className="text-ink-muted text-xs ml-2">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-cream-hover rounded-full">
                      <div className="h-1.5 rounded-full bg-forest transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-ink-muted text-[10px] mt-0.5">
                      Open reserves: {fmt(c.openReserves)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-padded">
            <p className="text-ink font-semibold text-sm mb-4">Exposure by Line of Business</p>
            <div className="space-y-3">
              {portfolio.byLine.map((l) => {
                const pct = portfolio.totalIncurred > 0 ? Math.round((l.incurred / portfolio.totalIncurred) * 100) : 0;
                const lineColor = l.line === "AL" ? "bg-forest" : l.line === "GL" ? "bg-violet-500" : "bg-orange-500";
                return (
                  <div key={l.line}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border font-medium",
                          l.line === "AL" ? "text-forest bg-forest/10 border-forest/30" :
                          l.line === "GL" ? "text-violet-700 bg-violet-50 border-violet-200" :
                                            "text-orange-700 bg-orange-50 border-orange-200")}>
                          {l.line}
                        </span>
                        <span className="text-ink text-sm font-medium">{LINE_NAMES[l.line] ?? l.line}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-ink text-xs font-semibold">{fmt(l.incurred)}</span>
                        <span className="text-ink-muted text-xs ml-2">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-cream-hover rounded-full">
                      <div className={`h-1.5 rounded-full ${lineColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-ink-muted text-[10px] mt-0.5">
                      {l.openClaims} open claims · {fmt(l.openReserves)} reserved
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Company exposure table ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-header mb-0">Company-Level Exposure</h2>
            <button onClick={() => setShowNote((v) => !v)}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-forest transition-colors">
              <Info className="w-3.5 h-3.5" />
              {showNote ? "Hide" : "About loss ratio estimate"}
            </button>
          </div>

          {showNote && (
            <div className="card-padded mb-3 bg-cream border border-cream-border text-xs text-ink-mid leading-relaxed">
              <strong className="text-ink">Loss Ratio Estimate:</strong> Calculated as total incurred losses divided by an estimated premium of $25,000 per unique policy number. This is a placeholder figure — connect to Applied Epic via Fabric to see actual written premium and true loss ratios.
            </div>
          )}

          {/* Filters */}
          <div className="card-padded mb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[180px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" placeholder="Search company..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-9 text-xs py-2" />
              </div>

              <div className="flex items-center gap-1.5">
                {["All", "AL", "GL", "APD"].map((l) => (
                  <button key={l} onClick={() => setFilterLine(l)}
                    className={clsx("px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      filterLine === l ? "pill-active" : "pill-inactive")}>
                    {l === "All" ? "All Lines" : l}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select value={filterCarrier} onChange={(e) => setFilterCarrier(e.target.value)}
                  className="form-select text-xs">
                  <option value="All">All Carriers</option>
                  {carriers.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3 text-ink-muted" />
                {([
                  { key: "reserves"   as SortKey, label: "Open Reserves" },
                  { key: "incurred"   as SortKey, label: "Incurred" },
                  { key: "lossRatio"  as SortKey, label: "Loss Ratio" },
                  { key: "openClaims" as SortKey, label: "Open Claims" },
                  { key: "name"       as SortKey, label: "Name" },
                ]).map(({ key, label }) => (
                  <button key={key} onClick={() => setSortBy(key)}
                    className={clsx("px-2.5 py-1 rounded-md text-xs transition-colors",
                      sortBy === key ? "bg-forest/15 text-forest font-medium" : "text-ink-muted hover:text-ink-mid")}>
                    {label}
                  </button>
                ))}
              </div>

              {(search || filterLine !== "All" || filterCarrier !== "All") && (
                <button onClick={() => { setSearch(""); setFilterLine("All"); setFilterCarrier("All"); }}
                  className="flex items-center gap-1 text-ink-muted hover:text-red-600 text-xs transition-colors ml-auto">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-border bg-cream-hover">
                  {["Company", "Carrier", "Line", "Open Claims", "Open Reserves", "Total Incurred", "Total Paid", "Est. Loss Ratio", "Risk", ""].map((h) => (
                    <th key={h} className="text-left text-ink-muted text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: CompanyExposure, i) => (
                  <tr key={c.company}
                    onClick={() => router.push(`/companies/${encodeURIComponent(c.company)}`)}
                    className={clsx(
                      "border-b border-cream-border/60 hover:bg-cream-hover transition-colors cursor-pointer",
                      i === filtered.length - 1 && "border-b-0",
                      c.openClaims > 0 && "bg-red-50/20"
                    )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-forest" />
                        </div>
                        <span className="text-ink font-medium text-xs truncate max-w-[160px]">{c.company}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-mid text-xs">{c.carrier}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border",
                        c.line === "AL" ? "text-forest bg-forest/10 border-forest/30" :
                        c.line === "GL" ? "text-violet-700 bg-violet-50 border-violet-200" :
                                          "text-orange-700 bg-orange-50 border-orange-200")}>
                        {c.line}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.openClaims > 0 ? (
                        <span className="text-xs font-bold text-red-600">{c.openClaims}</span>
                      ) : (
                        <span className="text-ink-faint text-xs">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs font-semibold",
                        c.openReserves > 500_000 ? "text-red-600" :
                        c.openReserves > 200_000 ? "text-amber-700" : "text-ink-mid")}>
                        {c.openReserves > 0 ? fmt(c.openReserves) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink text-xs font-semibold">{fmt(c.totalIncurred)}</td>
                    <td className="px-4 py-3 text-forest text-xs font-medium">{fmt(c.totalPaid)}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <LossRatioBar pct={c.lossRatioPct} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs font-bold",
                        c.riskScore >= 70 ? "text-red-600" :
                        c.riskScore >= 45 ? "text-amber-600" : "text-forest")}>
                        {c.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-ink-muted text-sm">No companies match the current filters.</div>
            )}
            <div className="border-t border-cream-border bg-cream-hover px-4 py-2 flex items-center justify-between">
              <span className="text-ink-muted text-xs">{filtered.length} companies</span>
              <span className="text-ink-muted text-xs">
                Total open reserves: <strong className="text-ink">{fmt(filtered.reduce((s, c) => s + c.openReserves, 0))}</strong>
                {" · "}
                Total incurred: <strong className="text-ink">{fmt(filtered.reduce((s, c) => s + c.totalIncurred, 0))}</strong>
              </span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

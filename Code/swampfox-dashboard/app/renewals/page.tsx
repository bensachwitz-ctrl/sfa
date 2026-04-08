"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { getRenewals, PolicyRenewal } from "@/lib/clientData";
import {
  RefreshCw, Calendar, AlertTriangle, ChevronRight,
  Building2, Shield, Search, X,
} from "lucide-react";
import clsx from "clsx";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const URGENCY_BORDER: Record<PolicyRenewal["urgency"], string> = {
  overdue:  "border-l-red-500",
  critical: "border-l-red-400",
  soon:     "border-l-amber-500",
  upcoming: "border-l-forest",
};

const URGENCY_BADGE: Record<PolicyRenewal["urgency"], string> = {
  overdue:  "text-red-700 bg-red-50 border-red-200",
  critical: "text-red-600 bg-red-50 border-red-200",
  soon:     "text-amber-700 bg-amber-50 border-amber-200",
  upcoming: "text-forest bg-forest/10 border-forest/30",
};

const URGENCY_LABEL: Record<PolicyRenewal["urgency"], string> = {
  overdue:  "Overdue",
  critical: "Due in 30 days",
  soon:     "Due in 60 days",
  upcoming: "Due in 90 days",
};

const LINE_STYLES: Record<string, string> = {
  AL:  "text-forest bg-forest/10 border-forest/30",
  GL:  "text-violet-700 bg-violet-50 border-violet-200",
  APD: "text-orange-700 bg-orange-50 border-orange-200",
};

export default function RenewalsPage() {
  const router = useRouter();
  const [filterUrgency, setFilterUrgency] = useState<string>("All");
  const [filterCarrier, setFilterCarrier] = useState<string>("All");
  const [search,        setSearch]        = useState("");

  const renewals = useMemo(() => getRenewals(), []);

  const filtered = useMemo(() =>
    renewals.filter((r) => {
      if (filterUrgency !== "All" && r.urgency !== filterUrgency) return false;
      if (filterCarrier !== "All" && r.carrier !== filterCarrier) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.company.toLowerCase().includes(q) && !r.policyNumber.toLowerCase().includes(q)) return false;
      }
      return true;
    }),
    [renewals, filterUrgency, filterCarrier, search]
  );

  const overdue  = renewals.filter((r) => r.urgency === "overdue").length;
  const critical = renewals.filter((r) => r.urgency === "critical").length;
  const soon     = renewals.filter((r) => r.urgency === "soon").length;
  const upcoming = renewals.filter((r) => r.urgency === "upcoming").length;
  const carriers = [...new Set(renewals.map((r) => r.carrier))].sort();

  return (
    <>
      <TopBar
        title="Policy Renewals"
        subtitle={`${renewals.length} policies renewing within 90 days · derived from current claims data`}
      />

      <main className="page-body space-y-6">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Up for Renewal" value={renewals.length}
            subtext="Within 90-day window" icon={RefreshCw} variant="default" />
          <StatCard label="Overdue / Due in 30d" value={overdue + critical}
            subtext="Immediate attention required" icon={AlertTriangle}
            variant={(overdue + critical) > 0 ? "danger" : "default"} />
          <StatCard label="Due in 31–60 Days"    value={soon}
            subtext="Prepare renewal packages" icon={Calendar}
            variant={soon > 0 ? "warning" : "default"} />
          <StatCard label="Due in 61–90 Days"    value={upcoming}
            subtext="Begin underwriting review" icon={Shield} variant="default" />
        </div>

        {/* ── Filters ── */}
        <div className="card-padded">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="text" placeholder="Search company or policy #..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-9 text-xs py-2" />
            </div>

            <div className="h-4 w-px bg-cream-border hidden sm:block" />

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-ink-muted text-xs">Urgency:</span>
              {["All", "overdue", "critical", "soon", "upcoming"].map((u) => (
                <button key={u} onClick={() => setFilterUrgency(u)}
                  className={clsx("px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                    filterUrgency === u ? "pill-active" : "pill-inactive")}>
                  {u === "All" ? "All" : URGENCY_LABEL[u as PolicyRenewal["urgency"]]}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-cream-border hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-ink-muted text-xs">Carrier:</span>
              <select value={filterCarrier} onChange={(e) => setFilterCarrier(e.target.value)}
                className="form-select text-xs">
                <option value="All">All Carriers</option>
                {carriers.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {(search || filterUrgency !== "All" || filterCarrier !== "All") && (
              <button onClick={() => { setSearch(""); setFilterUrgency("All"); setFilterCarrier("All"); }}
                className="flex items-center gap-1 text-ink-muted hover:text-red-600 text-xs transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}

            <span className="text-ink-faint text-xs ml-auto hidden lg:block">
              {filtered.length} of {renewals.length} policies
            </span>
          </div>
        </div>

        {/* ── Renewals Table ── */}
        {filtered.length === 0 ? (
          <div className="card-padded text-center text-ink-muted py-10">
            No renewals match the current filters.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card overflow-hidden hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-border bg-cream-hover">
                    {["Company", "Policy #", "Line", "Carrier", "Expiration", "Days Until", "Status", "Open Claims", "Total Incurred", "Risk Score", ""].map((h) => (
                      <th key={h} className="text-left text-ink-muted text-xs font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id}
                      onClick={() => router.push(`/companies/${encodeURIComponent(r.company)}`)}
                      className={clsx(
                        "border-b border-cream-border/60 hover:bg-cream-hover transition-colors cursor-pointer border-l-4",
                        URGENCY_BORDER[r.urgency],
                        i === filtered.length - 1 && "border-b-0"
                      )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-forest" />
                          </div>
                          <span className="text-ink font-medium text-xs truncate max-w-[180px]">{r.company}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-mid">{r.policyNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LINE_STYLES[r.line] ?? ""}`}>{r.line}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-mid text-xs">{r.carrier}</td>
                      <td className="px-4 py-3 text-ink-mid text-xs">{fmtDate(r.expiration)}</td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-xs font-bold tabular-nums",
                          r.daysUntilRenewal < 0 ? "text-red-600" :
                          r.daysUntilRenewal <= 30 ? "text-red-500" :
                          r.daysUntilRenewal <= 60 ? "text-amber-600" : "text-forest")}>
                          {r.daysUntilRenewal < 0 ? `${Math.abs(r.daysUntilRenewal)}d overdue` : `${r.daysUntilRenewal}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium", URGENCY_BADGE[r.urgency])}>
                          {URGENCY_LABEL[r.urgency]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.openClaims > 0 ? (
                          <span className="text-xs font-semibold text-red-600">{r.openClaims}</span>
                        ) : (
                          <span className="text-ink-faint text-xs">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink text-xs font-semibold">{fmt(r.totalIncurred)}</td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-xs font-bold",
                          r.riskScore >= 70 ? "text-red-600" : r.riskScore >= 45 ? "text-amber-600" : "text-forest")}>
                          {r.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 lg:hidden">
              {filtered.map((r) => (
                <div key={r.id}
                  onClick={() => router.push(`/companies/${encodeURIComponent(r.company)}`)}
                  className={clsx("card-padded cursor-pointer hover:bg-cream-hover transition-colors border-l-4", URGENCY_BORDER[r.urgency])}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-ink font-semibold text-sm">{r.company}</p>
                      <p className="text-ink-muted text-xs mt-0.5">{r.policyNumber} · {r.carrier}</p>
                    </div>
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium", URGENCY_BADGE[r.urgency])}>
                      {URGENCY_LABEL[r.urgency]}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                    <div>
                      <p className="text-ink-muted">Expires</p>
                      <p className="text-ink font-medium">{fmtDate(r.expiration)}</p>
                    </div>
                    <div>
                      <p className="text-ink-muted">Open Claims</p>
                      <p className={r.openClaims > 0 ? "text-red-600 font-bold" : "text-ink-mid"}>{r.openClaims}</p>
                    </div>
                    <div>
                      <p className="text-ink-muted">Incurred</p>
                      <p className="text-ink font-semibold">{fmt(r.totalIncurred)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Info note ── */}
        <div className="card-padded bg-cream border border-cream-border">
          <p className="text-ink-muted text-xs font-medium uppercase tracking-wider mb-2">Data Source Note</p>
          <p className="text-ink-mid text-xs leading-relaxed">
            Renewal dates are derived from policy expiration dates recorded in the claims data. For precise premium amounts, policy limits, and renewal terms, connect the Fabric SQL Analytics Endpoint to pull live data from Applied Epic.
          </p>
        </div>
      </main>
    </>
  );
}

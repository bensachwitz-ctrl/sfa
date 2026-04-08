"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { getPolicies, type PolicyRecord } from "@/lib/clientData";
import Modal from "@/components/Modal";
import {
  Shield, CalendarClock, AlertTriangle, DollarSign,
  Search, ChevronDown, X, Filter,
  Building2, ChevronRight, ArrowUpDown, FileText,
} from "lucide-react";
import Link from "next/link";
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

const STATUS_STYLES: Record<string, string> = {
  Active:  "text-forest bg-forest/10 border-forest/30",
  Overdue: "text-amber-700 bg-amber-50 border-amber-200",
  Expired: "text-ink-mid bg-cream-hover border-cream-border",
};

const LINE_STYLES: Record<string, string> = {
  AL:  "text-forest bg-forest/10 border-forest/30",
  GL:  "text-violet-700 bg-violet-50 border-violet-200",
  APD: "text-orange-700 bg-orange-50 border-orange-200",
};

type SortKey = "expiration" | "incurred" | "open" | "company" | "risk";

export default function PoliciesPage() {
  const [search,       setSearch]       = useState("");
  const [lineFilter,   setLineFilter]   = useState("All");
  const [carrierFilter, setCarrierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy,       setSortBy]       = useState<SortKey>("expiration");
  const [sortDesc,     setSortDesc]     = useState(false);
  const [renewalWin,   setRenewalWin]   = useState("All");
  const [modal, setModal]               = useState<"active"|"exp30"|"overdue"|"withOpen"|null>(null);

  const allPolicies = useMemo(() => getPolicies(), []);
  const carriers    = useMemo(() => [...new Set(allPolicies.map((p) => p.carrier))].sort(), [allPolicies]);

  // Modal datasets — exact lists that match each KPI
  const activePolicies = useMemo(() => allPolicies.filter((p) => p.status === "Active"), [allPolicies]);
  const exp30Policies  = useMemo(() => allPolicies.filter((p) => p.status === "Active" && p.daysUntilExpiration >= 0 && p.daysUntilExpiration <= 30).sort((a,b)=>a.daysUntilExpiration-b.daysUntilExpiration), [allPolicies]);
  const overduePolicies = useMemo(() => allPolicies.filter((p) => p.status === "Overdue").sort((a,b)=>a.daysUntilExpiration-b.daysUntilExpiration), [allPolicies]);
  const withOpenPolicies = useMemo(() => allPolicies.filter((p) => p.openClaims > 0).sort((a,b)=>b.openClaims-a.openClaims), [allPolicies]);

  const filtered = useMemo(() => {
    let rows = allPolicies;

    if (statusFilter !== "All")  rows = rows.filter((p) => p.status === statusFilter);
    if (lineFilter !== "All")    rows = rows.filter((p) => p.line === lineFilter);
    if (carrierFilter !== "All") rows = rows.filter((p) => p.carrier === carrierFilter);

    if (renewalWin !== "All") {
      const days = parseInt(renewalWin);
      rows = rows.filter((p) =>
        p.status !== "Expired" && p.daysUntilExpiration >= 0 && p.daysUntilExpiration <= days
      );
    }

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((p) =>
        p.company.toLowerCase().includes(q) ||
        p.policyNumber.toLowerCase().includes(q) ||
        p.carrier.toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "expiration") cmp = a.daysUntilExpiration - b.daysUntilExpiration;
      if (sortBy === "incurred")   cmp = a.totalIncurred - b.totalIncurred;
      if (sortBy === "open")       cmp = a.openClaims - b.openClaims;
      if (sortBy === "risk")       cmp = a.riskScore - b.riskScore;
      if (sortBy === "company")    cmp = a.company.localeCompare(b.company);
      return sortDesc ? -cmp : cmp;
    });
  }, [allPolicies, statusFilter, lineFilter, carrierFilter, renewalWin, search, sortBy, sortDesc]);

  // KPIs
  const active   = allPolicies.filter((p) => p.status === "Active").length;
  const overdue  = allPolicies.filter((p) => p.status === "Overdue").length;
  const exp30    = allPolicies.filter((p) => p.status === "Active" && p.daysUntilExpiration <= 30).length;
  const withOpen = allPolicies.filter((p) => p.openClaims > 0).length;
  const totalIncurred = allPolicies.reduce((s, p) => s + p.totalIncurred, 0);

  const hasFilters = search || lineFilter !== "All" || carrierFilter !== "All" || statusFilter !== "All" || renewalWin !== "All";

  function clearFilters() {
    setSearch(""); setLineFilter("All"); setCarrierFilter("All");
    setStatusFilter("All"); setRenewalWin("All");
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDesc((d) => !d);
    else { setSortBy(key); setSortDesc(true); }
  }

  return (
    <>
      <TopBar
        title="Policies"
        subtitle={`${allPolicies.length} unique policies · ${active} active · ${overdue} overdue`}
      />

      <main className="page-body space-y-5">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Active Policies"     value={active}
            subtext="Current term in force" icon={Shield} variant="default"
            onClick={() => setModal("active")} />
          <StatCard label="Expiring in 30 Days" value={exp30}
            subtext="Requires renewal action" icon={CalendarClock}
            variant={exp30 > 0 ? "warning" : "default"}
            onClick={() => setModal("exp30")} />
          <StatCard label="Overdue / At Risk"   value={overdue}
            subtext="Past expiration" icon={AlertTriangle}
            variant={overdue > 0 ? "danger" : "default"}
            onClick={() => setModal("overdue")} />
          <StatCard label="Policies w/ Open Claims" value={withOpen}
            subtext={`${allPolicies.reduce((s, p) => s + p.openClaims, 0)} total open claims`}
            icon={DollarSign}
            variant={withOpen > 5 ? "warning" : "default"}
            onClick={() => setModal("withOpen")} />
        </div>

        {/* ── Filters ── */}
        <div className="card-padded space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-ink-muted shrink-0" />

            {/* Search */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="text" placeholder="Company, policy #, carrier…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-9 text-xs py-2" />
            </div>

            <div className="h-4 w-px bg-cream-border hidden sm:block" />

            {/* Status */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "Active", "Overdue", "Expired"].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={clsx("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    statusFilter === s ? "pill-active" : "pill-inactive")}>
                  {s}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-cream-border hidden sm:block" />

            {/* Line */}
            <div className="relative">
              <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)}
                className="form-select">
                <option value="All">All Lines</option>
                <option value="AL">Auto Liability</option>
                <option value="GL">Gen. Liability</option>
                <option value="APD">Phys. Damage</option>
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Carrier */}
            <div className="relative">
              <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)}
                className="form-select">
                <option value="All">All Carriers</option>
                {carriers.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Renewal window */}
            <div className="relative">
              <select value={renewalWin} onChange={(e) => setRenewalWin(e.target.value)}
                className="form-select">
                <option value="All">All Renewals</option>
                <option value="7">Expiring in 7 days</option>
                <option value="30">Expiring in 30 days</option>
                <option value="60">Expiring in 60 days</option>
                <option value="90">Expiring in 90 days</option>
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-ink-muted hover:text-red-600 text-xs transition-colors ml-auto">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}

            <span className="text-ink-faint text-xs hidden lg:block ml-auto">
              {filtered.length} of {allPolicies.length} policies
            </span>
          </div>

          {/* Sort row */}
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowUpDown className="w-3 h-3 text-ink-muted" />
            <span className="text-ink-muted text-xs">Sort:</span>
            {([
              { key: "expiration" as SortKey, label: "Expiration" },
              { key: "open"       as SortKey, label: "Open Claims" },
              { key: "incurred"   as SortKey, label: "Incurred" },
              { key: "risk"       as SortKey, label: "Risk" },
              { key: "company"    as SortKey, label: "Company" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => toggleSort(key)}
                className={clsx("px-2.5 py-1 rounded-md text-xs transition-colors flex items-center gap-1",
                  sortBy === key
                    ? "bg-forest/15 text-forest font-medium"
                    : "text-ink-muted hover:text-ink-mid")}>
                {label}
                {sortBy === key && (
                  <span className="text-[10px]">{sortDesc ? "↓" : "↑"}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Policy Table ── */}
        {filtered.length === 0 ? (
          <div className="card-padded text-center text-ink-muted py-10">
            No policies match the current filters.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card overflow-hidden hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-border bg-cream-hover">
                    {[
                      "Company", "Policy #", "Carrier", "Line",
                      "Inception", "Expiration", "Status",
                      "Open", "Claims", "Incurred", ""
                    ].map((h) => (
                      <th key={h} className="text-left text-ink-muted text-[11px] font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <PolicyRow key={p.id} policy={p} isLast={i === filtered.length - 1} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 lg:hidden">
              {filtered.map((p) => (
                <PolicyCard key={p.id} policy={p} />
              ))}
            </div>

            {/* Summary footer */}
            <div className="card-padded bg-cream border border-cream-border">
              <div className="flex flex-wrap gap-6 text-xs">
                <span className="text-ink-mid">
                  <span className="font-semibold text-forest">{filtered.filter((p) => p.status === "Active").length}</span> active
                </span>
                <span className="text-ink-mid">
                  <span className="font-semibold text-amber-600">{filtered.filter((p) => p.status === "Overdue").length}</span> overdue
                </span>
                <span className="text-ink-mid">
                  <span className="font-semibold text-ink">{filtered.filter((p) => p.status === "Expired").length}</span> expired
                </span>
                <span className="text-ink-mid">
                  <span className="font-semibold text-red-600">{filtered.reduce((s, p) => s + p.openClaims, 0)}</span> total open claims
                </span>
                <span className="text-ink-mid ml-auto">
                  Total incurred: <span className="font-semibold">{fmt(totalIncurred)}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </main>
      {/* ── KPI Modals ── */}

      {/* Active Policies */}
      <Modal open={modal === "active"} onClose={() => setModal(null)}
        title="Active Policies" subtitle={`${activePolicies.length} policies currently in force`} size="xl">
        <PolicyModalList policies={activePolicies} onClose={() => setModal(null)} />
      </Modal>

      {/* Expiring in 30 Days */}
      <Modal open={modal === "exp30"} onClose={() => setModal(null)}
        title="Expiring in 30 Days" subtitle={`${exp30Policies.length} policies requiring renewal action`} size="xl">
        {exp30Policies.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-8">No policies expiring in the next 30 days.</p>
        ) : (
          <PolicyModalList policies={exp30Policies} onClose={() => setModal(null)} highlightExpiry />
        )}
      </Modal>

      {/* Overdue */}
      <Modal open={modal === "overdue"} onClose={() => setModal(null)}
        title="Overdue Policies" subtitle={`${overduePolicies.length} policies past expiration`} size="xl">
        {overduePolicies.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-8">No overdue policies.</p>
        ) : (
          <PolicyModalList policies={overduePolicies} onClose={() => setModal(null)} />
        )}
      </Modal>

      {/* With Open Claims */}
      <Modal open={modal === "withOpen"} onClose={() => setModal(null)}
        title="Policies with Open Claims" subtitle={`${withOpenPolicies.length} policies · ${withOpenPolicies.reduce((s,p)=>s+p.openClaims,0)} total open claims`} size="xl">
        <PolicyModalList policies={withOpenPolicies} onClose={() => setModal(null)} showOpenClaims />
      </Modal>
    </>
  );
}

function PolicyModalList({
  policies, onClose, highlightExpiry = false, showOpenClaims = false
}: {
  policies: PolicyRecord[];
  onClose: () => void;
  highlightExpiry?: boolean;
  showOpenClaims?: boolean;
}) {
  if (policies.length === 0) return <p className="text-ink-muted text-sm text-center py-8">No policies found.</p>;
  return (
    <div className="space-y-2">
      {policies.map((p) => (
        <Link key={p.id} href={`/companies/${encodeURIComponent(p.company)}`} onClick={onClose}
          className="flex items-center gap-3 p-3 rounded-xl bg-cream border border-cream-border hover:border-forest/40 hover:bg-cream-hover transition-all group">
          <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-forest" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink font-semibold text-sm truncate group-hover:text-forest transition-colors">{p.company}</p>
            <p className="text-ink-muted text-xs font-mono">{p.policyNumber} · {p.carrier}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <span className={clsx("px-1.5 py-0.5 rounded border text-[10px] font-medium",
              LINE_STYLES[p.line] ?? "")}>
              {p.line}
            </span>
            <div className="text-right">
              <p className={clsx("font-semibold tabular-nums",
                highlightExpiry && p.daysUntilExpiration <= 7 ? "text-red-600" :
                highlightExpiry ? "text-amber-700" : "text-ink-mid")}>
                {p.expiration ? new Date(p.expiration).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
              </p>
              {highlightExpiry && (
                <p className="text-[10px] text-amber-600 font-medium">{p.daysUntilExpiration}d left</p>
              )}
            </div>
            {showOpenClaims && p.openClaims > 0 && (
              <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                {p.openClaims} open
              </span>
            )}
            {p.totalIncurred > 0 && (
              <span className="text-ink font-semibold tabular-nums">{
                p.totalIncurred >= 1_000_000 ? `$${(p.totalIncurred/1_000_000).toFixed(1)}M` :
                p.totalIncurred >= 1_000 ? `$${(p.totalIncurred/1_000).toFixed(0)}K` :
                `$${p.totalIncurred}`
              }</span>
            )}
            <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-forest" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function PolicyRow({ policy: p, isLast }: { policy: PolicyRecord; isLast: boolean }) {
  const urgent = p.status === "Active" && p.daysUntilExpiration >= 0 && p.daysUntilExpiration <= 30;
  return (
    <tr className={clsx(
      "border-b border-cream-border/60 hover:bg-cream-hover transition-colors",
      isLast && "border-b-0",
      p.status === "Overdue" && "bg-amber-50/30",
      p.openClaims > 0 && p.status === "Active" && "bg-blue-50/20",
    )}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-forest" />
          </div>
          <span className="text-ink font-medium text-xs truncate max-w-[160px]">{p.company}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-ink-mid">{p.policyNumber}</td>
      <td className="px-4 py-3 text-ink-mid text-xs">{p.carrier}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LINE_STYLES[p.line] ?? ""}`}>
          {p.line}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-muted text-xs">{fmtDate(p.inception)}</td>
      <td className="px-4 py-3">
        <span className={clsx("text-xs", urgent ? "text-amber-700 font-semibold" : "text-ink-muted")}>
          {fmtDate(p.expiration)}
          {urgent && <span className="ml-1 text-[10px] text-amber-600">({p.daysUntilExpiration}d)</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[p.status] ?? ""}`}>
          {p.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {p.openClaims > 0
          ? <span className="text-xs font-bold text-red-600">{p.openClaims}</span>
          : <span className="text-ink-faint text-xs">0</span>}
      </td>
      <td className="px-4 py-3 text-ink-mid text-xs">{p.totalClaims}</td>
      <td className="px-4 py-3 text-ink text-xs font-semibold">
        {p.totalIncurred > 0 ? fmt(p.totalIncurred) : "—"}
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
      </td>
    </tr>
  );
}

function PolicyCard({ policy: p }: { policy: PolicyRecord }) {
  return (
    <div className={clsx("card-padded", p.status === "Overdue" && "border-l-4 border-l-amber-400")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink font-semibold text-sm truncate">{p.company}</p>
          <p className="text-ink-muted text-xs mt-0.5 font-mono">{p.policyNumber}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LINE_STYLES[p.line] ?? ""}`}>
            {p.line}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[p.status] ?? ""}`}>
            {p.status}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
        <div>
          <p className="text-ink-muted">Carrier</p>
          <p className="text-ink font-medium">{p.carrier}</p>
        </div>
        <div>
          <p className="text-ink-muted">Expires</p>
          <p className={clsx("font-medium",
            p.status === "Overdue" ? "text-amber-700" :
            p.daysUntilExpiration <= 30 ? "text-amber-600" : "text-ink")}>
            {fmtDate(p.expiration)}
          </p>
        </div>
        <div>
          <p className="text-ink-muted">Incurred</p>
          <p className="text-ink font-semibold">{p.totalIncurred > 0 ? fmt(p.totalIncurred) : "—"}</p>
        </div>
      </div>
      {p.openClaims > 0 && (
        <div className="mt-2 pt-2 border-t border-cream-border">
          <span className="text-xs text-red-600 font-medium">{p.openClaims} open claim{p.openClaims > 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}

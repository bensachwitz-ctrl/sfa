"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { getCompanies } from "@/lib/clientData";
import Modal from "@/components/Modal";
import Link from "next/link";
import {
  Building2, Search, ChevronRight, Truck,
  AlertCircle, ShieldAlert, Activity,
  ArrowUpDown, X,
} from "lucide-react";
import clsx from "clsx";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function RiskBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-red-500" : score >= 45 ? "bg-amber-500" :
    score >= 20 ? "bg-yellow-500" : "bg-forest-light";
  const textColor =
    score >= 70 ? "text-red-600" : score >= 45 ? "text-amber-600" :
    score >= 20 ? "text-yellow-600" : "text-forest";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-cream-hover rounded-full h-1.5 w-16">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={clsx("text-xs font-bold tabular-nums w-6 text-right", textColor)}>
        {score}
      </span>
    </div>
  );
}

function saferBadge(rating: string) {
  if (!rating || rating === "Unknown" || rating === "None" || rating === "Not Found") {
    return <span className="text-ink-muted text-xs">—</span>;
  }
  const isGood = rating.toLowerCase().includes("satisfactory") && !rating.toLowerCase().includes("un");
  const isBad  = rating.toLowerCase().includes("unsatisfactory") || rating.toLowerCase().includes("conditional");
  return (
    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium",
      isGood ? "text-forest bg-forest/10 border-forest/30" :
      isBad  ? "text-amber-700 bg-amber-50 border-amber-200" :
               "text-ink-mid bg-cream-hover border-cream-border")}>
      {rating.length > 20 ? rating.slice(0, 18) + "…" : rating}
    </span>
  );
}

type SortKey = "risk" | "incurred" | "open" | "name" | "claims";

export default function CompaniesPage() {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState<SortKey>("risk");
  const [filterLine, setFilterLine] = useState("All");
  const [modal, setModal]           = useState<"withOpen"|"incurred"|"highRisk"|null>(null);

  const allCompanies = useMemo(() => getCompanies(), []);

  const filtered = useMemo(() =>
    allCompanies
      .filter((c) => {
        const q = search.toLowerCase();
        return !q || c.name.toLowerCase().includes(q) || c.dot.includes(q);
      })
      .filter((c) => filterLine === "All" || c.topLine === filterLine)
      .sort((a, b) => {
        if (sortBy === "risk")     return b.riskScore - a.riskScore;
        if (sortBy === "incurred") return b.totalIncurred - a.totalIncurred;
        if (sortBy === "open")     return b.openClaims - a.openClaims;
        if (sortBy === "claims")   return b.totalClaims - a.totalClaims;
        return a.name.localeCompare(b.name);
      }),
    [allCompanies, search, filterLine, sortBy]
  );

  const withOpenClaims = allCompanies.filter((c) => c.openClaims > 0).length;
  const totalIncurred  = allCompanies.reduce((s, c) => s + c.totalIncurred, 0);
  const highRisk       = allCompanies.filter((c) => c.riskScore >= 60).length;

  return (
    <>
      <TopBar
        title="Companies & DOT"
        subtitle={`${allCompanies.length} insureds · click any company to see claims history and SAFER data`}
      />

      <main className="page-body space-y-6">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Companies"          value={allCompanies.length}
            subtext="Active insureds" icon={Building2} variant="default" />
          <StatCard label="Companies w/ Open Claims" value={withOpenClaims}
            subtext={`${allCompanies.reduce((s, c) => s + c.openClaims, 0)} total open claims`}
            icon={AlertCircle} variant={withOpenClaims > 10 ? "warning" : "default"}
            onClick={() => setModal("withOpen")} />
          <StatCard label="Total Incurred (Portfolio)" value={fmt(totalIncurred)}
            subtext="All companies · all time" icon={Activity} variant="default"
            onClick={() => setModal("incurred")} />
          <StatCard label="High-Risk Companies" value={highRisk}
            subtext="Risk score ≥ 60" icon={ShieldAlert}
            variant={highRisk > 5 ? "danger" : "warning"}
            onClick={() => setModal("highRisk")} />
        </div>

        {/* ── Filters ── */}
        <div className="card-padded">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="text" placeholder="Search name or DOT #…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10" />
            </div>

            <div className="h-5 w-px bg-cream-border hidden sm:block" />

            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "AL", "GL", "APD"].map((l) => (
                <button key={l} onClick={() => setFilterLine(l)}
                  className={clsx("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    filterLine === l ? "pill-active" : "pill-inactive")}>
                  {l === "All" ? "All Lines" : l === "AL" ? "Auto Liability" : l === "GL" ? "Gen. Liability" : "Phys. Damage"}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-cream-border hidden md:block" />

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3 h-3 text-ink-muted" />
              {([
                { key: "risk" as SortKey,     label: "Risk" },
                { key: "incurred" as SortKey, label: "Incurred" },
                { key: "open" as SortKey,     label: "Open Claims" },
                { key: "claims" as SortKey,   label: "Total Claims" },
                { key: "name" as SortKey,     label: "Name" },
              ]).map(({ key, label }) => (
                <button key={key} onClick={() => setSortBy(key)}
                  className={clsx("px-2.5 py-1 rounded-md text-xs transition-colors",
                    sortBy === key
                      ? "bg-forest/15 text-forest font-medium"
                      : "text-ink-muted hover:text-ink-mid")}>
                  {label}
                </button>
              ))}
            </div>

            {search && (
              <button onClick={() => setSearch("")}
                className="flex items-center gap-1 text-ink-muted hover:text-red-600 text-xs ml-auto transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}

            <span className="text-ink-faint text-xs hidden lg:block ml-auto">
              {filtered.length} of {allCompanies.length} companies
            </span>
          </div>
        </div>

        {/* ── Company List ── */}
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <div className="card-padded text-center text-ink-muted py-10">
              No companies match your search.
            </div>
          )}

          {filtered.length > 0 && (
            <div className="hidden lg:grid grid-cols-[1fr_80px_80px_100px_80px_90px_80px_40px] gap-3 px-4 py-1.5">
              {["Company", "DOT", "SAFER", "Incurred", "Open", "Claims", "Risk", ""].map((h) => (
                <div key={h} className="text-ink-muted text-[10px] font-medium uppercase tracking-wider">{h}</div>
              ))}
            </div>
          )}

          {filtered.map((c) => {
            const risk = c.riskScore;
            const borderColor =
              risk >= 70 ? "border-l-red-500" :
              risk >= 45 ? "border-l-amber-500" :
              risk >= 20 ? "border-l-yellow-500" :
                           "border-l-forest";
            return (
              <button key={c.id}
                onClick={() => router.push(`/companies/${encodeURIComponent(c.id)}`)}
                className={clsx(
                  "w-full text-left card-padded hover:bg-cream-hover active:scale-[0.998] transition-all group border-l-4",
                  borderColor
                )}>
                <div className="flex items-center gap-3 flex-wrap lg:grid lg:grid-cols-[1fr_80px_80px_100px_80px_90px_80px_40px]">
                  <div className="flex items-center gap-3 min-w-[200px] flex-1 lg:flex-none">
                    <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-forest" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink font-semibold text-sm truncate group-hover:text-forest transition-colors">
                        {c.name}
                      </p>
                      <p className="text-ink-muted text-[10px] flex items-center gap-1 mt-0.5">
                        {c.topLine && (
                          <span className={clsx("font-medium",
                            c.topLine === "AL" ? "text-forest" :
                            c.topLine === "GL" ? "text-violet-600" : "text-orange-600")}>
                            {c.topLine}
                          </span>
                        )}
                        {c.topLine && c.topCategory && <span>·</span>}
                        <span className="truncate max-w-[160px]">{c.topCategory}</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    {c.dot ? (
                      <span className="flex items-center gap-1 text-ink-mid text-xs">
                        <Truck className="w-3 h-3 shrink-0" />{c.dot}
                      </span>
                    ) : (
                      <span className="text-ink-faint text-xs">—</span>
                    )}
                  </div>

                  <div>{saferBadge(c.saferRating)}</div>

                  <div>
                    <p className="text-ink text-sm font-semibold">{fmt(c.totalIncurred)}</p>
                  </div>

                  <div>
                    {c.openClaims > 0 ? (
                      <span className="text-xs font-semibold text-red-600">{c.openClaims}</span>
                    ) : (
                      <span className="text-ink-faint text-xs">0</span>
                    )}
                  </div>

                  <div>
                    <span className="text-ink-mid text-sm font-medium">{c.totalClaims}</span>
                  </div>

                  <div className="min-w-[80px]">
                    <RiskBar score={risk} />
                  </div>

                  <div className="flex justify-end">
                    <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-forest transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Companies with open claims */}
      <Modal open={modal === "withOpen"} onClose={() => setModal(null)}
        title="Companies with Open Claims"
        subtitle={`${allCompanies.filter(c=>c.openClaims>0).length} companies · ${allCompanies.reduce((s,c)=>s+c.openClaims,0)} total open claims`}
        size="lg">
        <div className="space-y-2">
          {allCompanies.filter(c => c.openClaims > 0).sort((a,b) => b.openClaims - a.openClaims).map((c) => (
            <button key={c.id} onClick={() => { router.push(`/companies/${encodeURIComponent(c.id)}`); setModal(null); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-cream border border-cream-border hover:border-forest/40 hover:bg-cream-hover transition-all text-left group">
              <div>
                <p className="text-ink font-semibold text-sm group-hover:text-forest transition-colors">{c.name}</p>
                <p className="text-ink-muted text-xs">{fmt(c.totalReserved)} reserved · risk {c.riskScore}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  {c.openClaims} open
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Top by incurred */}
      <Modal open={modal === "incurred"} onClose={() => setModal(null)}
        title="Top Companies by Total Incurred" subtitle={`${fmt(totalIncurred)} portfolio total`} size="lg">
        <div className="space-y-2">
          {[...allCompanies].sort((a,b)=>b.totalIncurred-a.totalIncurred).slice(0,20).map((c, i) => (
            <button key={c.id} onClick={() => { router.push(`/companies/${encodeURIComponent(c.id)}`); setModal(null); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-cream border border-cream-border hover:border-forest/40 hover:bg-cream-hover transition-all text-left group">
              <span className="text-ink-faint text-xs w-5 font-mono shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-ink font-medium text-sm truncate group-hover:text-forest transition-colors">{c.name}</p>
                <div className="h-1.5 bg-cream-hover rounded-full mt-1.5">
                  <div className="h-1.5 rounded-full bg-orange-400" style={{width:`${Math.round((c.totalIncurred/([...allCompanies].sort((a,b)=>b.totalIncurred-a.totalIncurred)[0]?.totalIncurred??1))*100)}%`}} />
                </div>
              </div>
              <span className="text-ink font-bold text-sm tabular-nums shrink-0">{fmt(c.totalIncurred)}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* High risk */}
      <Modal open={modal === "highRisk"} onClose={() => setModal(null)}
        title="High-Risk Companies" subtitle={`${highRisk} companies with risk score ≥ 60`} size="lg">
        <div className="space-y-2">
          {allCompanies.filter(c=>c.riskScore>=60).sort((a,b)=>b.riskScore-a.riskScore).map((c) => (
            <button key={c.id} onClick={() => { router.push(`/companies/${encodeURIComponent(c.id)}`); setModal(null); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-cream border border-cream-border hover:border-red-300 hover:bg-red-50/30 transition-all text-left group">
              <div>
                <p className="text-ink font-semibold text-sm group-hover:text-forest transition-colors">{c.name}</p>
                <p className="text-ink-muted text-xs">{c.openClaims} open claims · {fmt(c.totalIncurred)} incurred</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.riskScore>=80?"text-red-700 bg-red-50 border-red-200":"text-amber-700 bg-amber-50 border-amber-200"}`}>
                  {c.riskScore}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

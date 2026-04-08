"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import Modal from "@/components/Modal";
import PortfolioIncurredChart from "@/components/charts/PortfolioIncurredChart";
import LineOfBusinessChart from "@/components/charts/LineOfBusinessChart";
import ClaimsByCategoryChart from "@/components/charts/ClaimsByCategoryChart";
import {
  getPortfolioKPIs, getPortfolioCharts, getCompanies,
  getFilteredClaims, getRenewals,
} from "@/lib/clientData";
import { getSpeedingKPIs } from "@/lib/samsaraData";
import {
  FileText, Shield, Building2, Activity, AlertCircle,
  DollarSign, TrendingUp, ChevronRight, Gauge, MapPin,
  CheckCircle2, BarChart3,
} from "lucide-react";
import clsx from "clsx";

const SamsaraMap = dynamic(() => import("@/components/SamsaraMap"), { ssr: false });

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

const CARRIER_COLORS: Record<string, string> = {
  Accredited: "bg-forest",
  FICoSE:     "bg-violet-500",
  SFP:        "bg-orange-500",
  Lloyds:     "bg-blue-500",
};

const LINE_COLORS: Record<string, string> = {
  AL:  "text-forest bg-forest/10 border-forest/30",
  GL:  "text-violet-700 bg-violet-50 border-violet-200",
  APD: "text-orange-700 bg-orange-50 border-orange-200",
};

type ModalKey =
  | "totalClaims" | "openClaims" | "totalIncurred" | "openReserves"
  | "companies" | "avgClaims" | "closedClaims" | "avgIncurred"
  | "speedingEvents" | "highSeverity" | "topOffender" | "avgEvents";

export default function OverviewPage() {
  const [modal, setModal] = useState<ModalKey | null>(null);
  const close = () => setModal(null);

  const kpis    = useMemo(() => getPortfolioKPIs(), []);
  const charts  = useMemo(() => getPortfolioCharts(), []);
  const companies = useMemo(() => getCompanies(), []);
  const telKPIs = useMemo(() => getSpeedingKPIs(30), []);
  const renewals = useMemo(() => getRenewals(), []);

  const openClaims = useMemo(
    () => getFilteredClaims({ status: "Open", pageSize: 500 }).claims,
    []
  );
  const companiesWithOpen = useMemo(
    () => companies.filter((c) => c.openClaims > 0).sort((a, b) => b.openClaims - a.openClaims),
    [companies]
  );
  const companiesWithReserves = useMemo(
    () => companies.filter((c) => c.totalReserved > 0).sort((a, b) => b.totalReserved - a.totalReserved),
    [companies]
  );
  const topByIncurred = useMemo(
    () => [...companies].sort((a, b) => b.totalIncurred - a.totalIncurred).slice(0, 15),
    [companies]
  );

  return (
    <>
      <TopBar
        title="Agency Overview"
        subtitle={`${kpis.totalClaims.toLocaleString()} claims · ${kpis.totalCompanies} insureds · ${fmt(kpis.totalIncurred)} total incurred`}
      />

      <main className="page-body space-y-6">
        {/* ── Hero Banner ── */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a1f0a 0%, #1a3a1a 50%, #2d5a2d 100%)",
            boxShadow: "0 4px 24px rgba(10,31,10,0.2)",
          }}
        >
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #8ab87a 0%, transparent 60%)" }} />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#8ab87a" }}>
                Portfolio Status — Live
              </p>
              <h2 className="text-2xl font-bold" style={{ color: "#f5f0e0" }}>
                {fmt(kpis.totalIncurred)} Total Incurred
              </h2>
              <p className="mt-1 text-sm" style={{ color: "rgba(245,240,224,0.6)" }}>
                {kpis.openClaims} open claims across {kpis.companiesWithOpenClaims} companies
                &nbsp;·&nbsp; {kpis.totalCompanies} active insureds
              </p>
            </div>
            <div className="flex items-center gap-6">
              {[
                { label: "Open Reserves",  value: fmt(kpis.totalReserved),   color: "#f59e0b" },
                { label: "Total Paid",     value: fmt(kpis.totalPaid),        color: "#8ab87a" },
                { label: "Closed Claims",  value: kpis.closedClaims.toLocaleString(), color: "#a3e635" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center hidden sm:block">
                  <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(245,240,224,0.5)" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Row 1 ── */}
        <section>
          <h2 className="section-header flex items-center gap-2">
            <Activity className="w-4 h-4 text-forest" /> Portfolio Summary
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total Claims" value={kpis.totalClaims.toLocaleString()}
              subtext="All carriers · all years" icon={FileText} variant="default"
              onClick={() => setModal("totalClaims")}
            />
            <StatCard
              label="Open Claims" value={kpis.openClaims}
              subtext={`${kpis.companiesWithOpenClaims} companies affected`}
              icon={AlertCircle} variant={kpis.openClaims > 50 ? "danger" : "warning"}
              onClick={() => setModal("openClaims")}
            />
            <StatCard
              label="Total Incurred" value={fmt(kpis.totalIncurred)}
              subtext="Paid + reserved (all time)" icon={DollarSign} variant="default"
              onClick={() => setModal("totalIncurred")}
            />
            <StatCard
              label="Open Reserves" value={fmt(kpis.totalReserved)}
              subtext="Active open claim reserves" icon={TrendingUp}
              variant={kpis.totalReserved > 1_000_000 ? "warning" : "default"}
              onClick={() => setModal("openReserves")}
            />
          </div>
        </section>

        {/* ── KPI Row 2 ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Insured Companies" value={kpis.totalCompanies}
            subtext="Active insureds in portfolio" icon={Building2} variant="default"
            onClick={() => setModal("companies")}
          />
          <StatCard
            label="Avg Claims / Company" value={kpis.avgClaimsPerCompany}
            subtext="Portfolio average" icon={FileText} variant="default"
            onClick={() => setModal("avgClaims")}
          />
          <StatCard
            label="Closed Claims" value={kpis.closedClaims.toLocaleString()}
            subtext="Successfully resolved" icon={CheckCircle2} variant="success"
            onClick={() => setModal("closedClaims")}
          />
          <StatCard
            label="Avg Incurred / Claim" value={fmt(kpis.avgIncurredPerClaim)}
            subtext="Across all claims" icon={DollarSign} variant="default"
            onClick={() => setModal("avgIncurred")}
          />
        </div>

        {/* ── Loss Trend ── */}
        <section>
          <h2 className="section-header flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-forest" /> Loss History by Year
          </h2>
          <div className="card-padded">
            <div className="mb-4">
              <p className="text-ink font-semibold text-sm">Paid vs. Reserved — Annual Portfolio Trend</p>
              <p className="text-ink-muted text-xs mt-0.5">Paid losses (green) · open reserves (amber) · claim count (dashed)</p>
            </div>
            <div style={{ height: "280px" }}>
              <PortfolioIncurredChart data={charts.incurredByYear} />
            </div>
          </div>
        </section>

        {/* ── Line of Business + Categories ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-padded">
            <p className="text-ink font-semibold text-sm mb-1">Incurred by Line of Business</p>
            <p className="text-ink-muted text-xs mb-4">AL · GL · APD — share of total incurred</p>
            <div style={{ height: "240px" }}>
              <LineOfBusinessChart data={charts.claimsByLine} mode="incurred" />
            </div>
          </div>
          <div className="card-padded">
            <p className="text-ink font-semibold text-sm mb-1">Top Loss Categories</p>
            <p className="text-ink-muted text-xs mb-4">Total incurred by accident category</p>
            <div style={{ height: "240px" }}>
              <ClaimsByCategoryChart data={charts.claimsByCategory} mode="incurred" />
            </div>
          </div>
        </div>

        {/* ── Carrier + Top Companies ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-padded">
            <p className="text-ink font-semibold text-sm mb-4">Claims by Carrier</p>
            <div className="space-y-3">
              {charts.claimsByCarrier.map((c) => {
                const total = charts.claimsByCarrier.reduce((s, x) => s + x.count, 0);
                const pct = total ? Math.round((c.count / total) * 100) : 0;
                return (
                  <div key={c.carrier} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${CARRIER_COLORS[c.carrier] ?? "bg-ink-faint"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-ink text-sm font-medium">{c.carrier}</span>
                        <span className="text-ink-mid text-xs">{c.count} claims · {fmt(c.incurred)}</span>
                      </div>
                      <div className="h-1.5 bg-cream-hover rounded-full">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${CARRIER_COLORS[c.carrier] ?? "bg-ink-faint"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-ink-muted text-xs w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center justify-between mb-4">
              <p className="text-ink font-semibold text-sm">Top 10 by Total Incurred</p>
              <Link href="/companies" className="text-forest text-xs hover:text-forest-mid flex items-center gap-1 transition-colors">
                All companies <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {charts.topByIncurred.map((c, i) => {
                const max = charts.topByIncurred[0]?.incurred ?? 1;
                const pct = Math.round((c.incurred / max) * 100);
                return (
                  <Link key={c.name} href={`/companies/${encodeURIComponent(c.name)}`} className="block group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-ink-faint text-xs w-4">{i + 1}</span>
                      <span className="text-ink text-xs font-medium truncate flex-1 group-hover:text-forest transition-colors">{c.name}</span>
                      <span className="text-ink text-xs font-semibold shrink-0">{fmt(c.incurred)}</span>
                      {c.openClaims > 0 && (
                        <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">
                          {c.openClaims} open
                        </span>
                      )}
                    </div>
                    <div className="h-1 bg-cream-hover rounded-full ml-6">
                      <div className="h-1 rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Fleet Telematics ── */}
        <section>
          <h2 className="section-header flex items-center gap-2">
            <Gauge className="w-4 h-4 text-forest" /> Fleet Telematics — Last 30 Days
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Speeding Events" value={telKPIs.totalEvents.toLocaleString()}
              subtext="All companies · last 30 days" icon={Gauge}
              variant={telKPIs.totalEvents > 100 ? "warning" : "default"}
              onClick={() => setModal("speedingEvents")}
            />
            <StatCard
              label="High-Severity Events" value={telKPIs.highSeverityEvents}
              subtext=">20 mph over posted limit" icon={AlertCircle}
              variant={telKPIs.highSeverityEvents > 20 ? "danger" : "warning"}
              onClick={() => setModal("highSeverity")}
            />
            <StatCard
              label="Top Offending Company" value={telKPIs.topCompanyCount}
              subtext={telKPIs.topCompany} icon={MapPin} variant="default"
              onClick={() => setModal("topOffender")}
            />
            <StatCard
              label="Avg Events / Company" value={telKPIs.avgEventsPerCompany}
              subtext={`${telKPIs.uniqueDrivers} unique drivers tracked`} icon={TrendingUp} variant="default"
              onClick={() => setModal("avgEvents")}
            />
          </div>
          <div className="card overflow-hidden">
            <SamsaraMap height={420} showFilters={true} />
          </div>
          <p className="text-ink-faint text-xs mt-2 px-1">
            GPS-tagged speeding events. Amber = &lt;10 mph over · Orange = 10–20 over · Red = &gt;20 over.
            <Link href="/drivers" className="text-forest hover:text-forest-mid ml-2 transition-colors">View full driver report</Link>
          </p>
        </section>

        {/* ── Quick Nav ── */}
        <section>
          <h2 className="section-header">Quick Navigation</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { href: "/claims",      label: "Claims",      description: `Browse all ${kpis.totalClaims} claims by company`,           icon: FileText,    color: "text-forest",     border: "border-forest/20 hover:border-forest/50" },
              { href: "/companies",   label: "Companies",   description: `${kpis.totalCompanies} insureds · SAFER · loss data`,         icon: Building2,   color: "text-amber-700",  border: "border-amber-200 hover:border-amber-400" },
              { href: "/risk-alerts", label: "Risk Alerts", description: "Open claims · OOS rates · SAFER flags",                       icon: AlertCircle, color: "text-red-600",    border: "border-red-200 hover:border-red-400" },
              { href: "/drivers",     label: "Drivers",     description: "Telematics · risk scores · Samsara GPS",                      icon: Shield,      color: "text-violet-600", border: "border-violet-200 hover:border-violet-400" },
            ].map(({ href, label, description, icon: Icon, color, border }) => (
              <Link key={href} href={href}
                className={`card-padded border ${border} hover:shadow-md transition-all group`}>
                <Icon className={`w-6 h-6 ${color} mb-3`} />
                <p className="text-ink font-semibold text-sm group-hover:text-forest-dark transition-colors">{label}</p>
                <p className="text-ink-muted text-xs mt-1">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Total Claims */}
      <Modal open={modal === "totalClaims"} onClose={close} title="All Claims" subtitle={`${kpis.totalClaims.toLocaleString()} total · all carriers · all years`} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Open",   value: kpis.openClaims,   color: "text-red-600" },
              { label: "Closed", value: kpis.closedClaims, color: "text-forest" },
              { label: "Total",  value: kpis.totalClaims,  color: "text-ink" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-cream rounded-xl p-4 border border-cream-border text-center">
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
                <p className="text-ink-muted text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-ink font-semibold text-sm mb-3">By Year</p>
            <div className="space-y-2">
              {charts.incurredByYear.map((y) => (
                <div key={y.year} className="flex items-center gap-3">
                  <span className="text-ink-mid text-xs w-10 shrink-0 font-mono">{y.year}</span>
                  <div className="flex-1 h-2 bg-cream-hover rounded-full">
                    <div className="h-2 rounded-full bg-forest transition-all duration-500"
                      style={{ width: `${Math.round((y.claims / kpis.totalClaims) * 100)}%` }} />
                  </div>
                  <span className="text-ink text-xs font-semibold w-8 text-right tabular-nums">{y.claims}</span>
                  <span className="text-ink-muted text-xs w-20 text-right tabular-nums">{fmt(y.incurred)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-ink font-semibold text-sm mb-3">By Carrier</p>
            <div className="space-y-2">
              {charts.claimsByCarrier.map((c) => (
                <div key={c.carrier} className="flex items-center justify-between px-3 py-2 rounded-lg bg-cream border border-cream-border">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${CARRIER_COLORS[c.carrier] ?? "bg-ink-faint"}`} />
                    <span className="text-ink text-sm font-medium">{c.carrier}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-ink-muted">
                    <span>{c.count} claims</span>
                    <span className="font-semibold text-ink">{fmt(c.incurred)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Link href="/claims" className="flex items-center justify-center gap-2 text-forest text-sm font-medium hover:text-forest-mid transition-colors pt-2 border-t border-cream-border">
            Browse all claims <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Modal>

      {/* Open Claims */}
      <Modal open={modal === "openClaims"} onClose={close} title="Open Claims" subtitle={`${kpis.openClaims} open across ${kpis.companiesWithOpenClaims} companies`} size="lg">
        <div className="space-y-3">
          {companiesWithOpen.map((co) => (
            <Link key={co.id} href={`/companies/${encodeURIComponent(co.id)}`} onClick={close}
              className="flex items-center justify-between p-3 rounded-xl bg-cream border border-cream-border hover:border-forest/40 hover:bg-cream-hover transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-forest" />
                </div>
                <div>
                  <p className="text-ink font-semibold text-sm group-hover:text-forest transition-colors">{co.name}</p>
                  <p className="text-ink-muted text-xs">{fmt(co.totalReserved)} reserved · risk score {co.riskScore}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  {co.openClaims} open
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-forest" />
              </div>
            </Link>
          ))}
          <Link href="/claims?status=Open" onClick={close}
            className="flex items-center justify-center gap-2 text-forest text-sm font-medium hover:text-forest-mid transition-colors pt-2 border-t border-cream-border">
            View all open claims <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Modal>

      {/* Total Incurred */}
      <Modal open={modal === "totalIncurred"} onClose={close} title="Total Incurred" subtitle={`${fmt(kpis.totalIncurred)} across all companies · all time`} size="xl">
        <div className="space-y-3">
          {topByIncurred.map((co, i) => {
            const pct = Math.round((co.totalIncurred / topByIncurred[0].totalIncurred) * 100);
            return (
              <Link key={co.id} href={`/companies/${encodeURIComponent(co.id)}`} onClick={close}
                className="flex items-center gap-3 p-3 rounded-xl bg-cream border border-cream-border hover:border-forest/40 hover:bg-cream-hover transition-all group">
                <span className="text-ink-faint text-xs w-5 shrink-0 font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ink font-semibold text-sm truncate group-hover:text-forest transition-colors">{co.name}</span>
                    <span className="text-ink font-bold text-sm tabular-nums shrink-0 ml-2">{fmt(co.totalIncurred)}</span>
                  </div>
                  <div className="h-1.5 bg-cream-hover rounded-full">
                    <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {co.openClaims > 0 && (
                  <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">
                    {co.openClaims} open
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </Modal>

      {/* Open Reserves */}
      <Modal open={modal === "openReserves"} onClose={close} title="Open Reserves" subtitle={`${fmt(kpis.totalReserved)} across ${companiesWithReserves.length} companies`} size="lg">
        <div className="space-y-3">
          {companiesWithReserves.map((co) => (
            <Link key={co.id} href={`/companies/${encodeURIComponent(co.id)}`} onClick={close}
              className="flex items-center justify-between p-3 rounded-xl bg-cream border border-cream-border hover:border-amber-300 hover:bg-amber-50/30 transition-all group">
              <div>
                <p className="text-ink font-semibold text-sm group-hover:text-forest transition-colors">{co.name}</p>
                <p className="text-ink-muted text-xs">{co.openClaims} open claims · {co.carriers[0]}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber-700 font-bold text-sm tabular-nums">{fmt(co.totalReserved)}</span>
                <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-forest" />
              </div>
            </Link>
          ))}
        </div>
      </Modal>

      {/* Companies */}
      <Modal open={modal === "companies"} onClose={close} title="All Insured Companies" subtitle={`${kpis.totalCompanies} active in portfolio`} size="lg">
        <div className="space-y-2">
          {companies.slice(0, 20).map((co) => (
            <Link key={co.id} href={`/companies/${encodeURIComponent(co.id)}`} onClick={close}
              className="flex items-center justify-between p-3 rounded-xl bg-cream border border-cream-border hover:border-forest/40 hover:bg-cream-hover transition-all group">
              <div className="flex items-center gap-3">
                <div className={clsx("w-2 h-7 rounded-full shrink-0",
                  co.riskScore >= 70 ? "bg-red-500" : co.riskScore >= 45 ? "bg-amber-500" : "bg-forest")} />
                <div>
                  <p className="text-ink font-medium text-sm group-hover:text-forest transition-colors">{co.name}</p>
                  <p className="text-ink-muted text-xs">{co.topLine} · {co.totalClaims} claims</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-ink font-semibold tabular-nums">{fmt(co.totalIncurred)}</span>
                {co.openClaims > 0 && (
                  <span className="text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">
                    {co.openClaims} open
                  </span>
                )}
              </div>
            </Link>
          ))}
          {companies.length > 20 && (
            <Link href="/companies" onClick={close}
              className="flex items-center justify-center gap-2 text-forest text-sm font-medium hover:text-forest-mid transition-colors pt-3 border-t border-cream-border">
              View all {companies.length} companies <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </Modal>

      {/* Avg Claims / Company */}
      <Modal open={modal === "avgClaims"} onClose={close} title="Claims per Company" subtitle="Distribution across all insureds" size="md">
        <div className="space-y-3">
          {[
            { label: "10+ claims",  companies: companies.filter((c) => c.totalClaims >= 10), color: "text-red-600" },
            { label: "5–9 claims",  companies: companies.filter((c) => c.totalClaims >= 5 && c.totalClaims < 10), color: "text-amber-600" },
            { label: "2–4 claims",  companies: companies.filter((c) => c.totalClaims >= 2 && c.totalClaims < 5), color: "text-ink" },
            { label: "1 claim",     companies: companies.filter((c) => c.totalClaims === 1), color: "text-forest" },
          ].map(({ label, companies: cos, color }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-cream border border-cream-border">
              <span className="text-ink-mid text-sm">{label}</span>
              <span className={`font-bold text-lg tabular-nums ${color}`}>{cos.length}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-cream-border">
            <p className="text-ink-muted text-xs text-center">Portfolio average: {kpis.avgClaimsPerCompany} claims per company</p>
          </div>
        </div>
      </Modal>

      {/* Closed Claims */}
      <Modal open={modal === "closedClaims"} onClose={close} title="Closed Claims" subtitle={`${kpis.closedClaims.toLocaleString()} successfully resolved`} size="md">
        <div className="space-y-3">
          {charts.incurredByYear.map((y) => {
            const closedPct = Math.round(((y.claims - (openClaims.filter(c => c.dateOfLoss?.startsWith(y.year)).length)) / y.claims) * 100);
            return (
              <div key={y.year} className="p-3 rounded-lg bg-cream border border-cream-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-ink font-medium text-sm">{y.year}</span>
                  <span className="text-ink-muted text-xs">{y.claims} total claims</span>
                </div>
                <div className="h-2 bg-cream-hover rounded-full">
                  <div className="h-2 rounded-full bg-forest transition-all duration-700"
                    style={{ width: `${Math.min(closedPct, 100)}%` }} />
                </div>
                <p className="text-forest text-xs mt-1 font-medium">{fmt(y.paid)} paid</p>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Avg Incurred / Claim */}
      <Modal open={modal === "avgIncurred"} onClose={close} title="Average Incurred per Claim" subtitle="Breakdown by line of business and carrier" size="md">
        <div className="space-y-4">
          <div className="text-center py-4 bg-cream rounded-xl border border-cream-border">
            <p className="text-4xl font-bold text-ink tabular-nums">{fmt(kpis.avgIncurredPerClaim)}</p>
            <p className="text-ink-muted text-sm mt-1">portfolio average per claim</p>
          </div>
          <div>
            <p className="text-ink font-semibold text-sm mb-2">By Line of Business</p>
            <div className="space-y-2">
              {charts.claimsByLine.map((l) => (
                <div key={l.line} className="flex items-center justify-between p-2.5 rounded-lg bg-cream border border-cream-border">
                  <span className={clsx("text-[11px] px-2 py-0.5 rounded border font-medium", LINE_COLORS[l.line] ?? "")}>
                    {l.line}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-ink-muted">
                    <span>{l.count} claims</span>
                    <span className="font-semibold text-ink">{fmt(l.count > 0 ? l.incurred / l.count : 0)} avg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Speeding Events */}
      <Modal open={modal === "speedingEvents"} onClose={close} title="Speeding Events — Last 30 Days" subtitle={`${telKPIs.totalEvents} events · ${telKPIs.uniqueVehicles} vehicles`} size="md">
        <div className="space-y-3">
          {[
            { label: "High severity (>20 mph over)",   value: telKPIs.highSeverityEvents, color: "text-red-600",   bg: "bg-red-50 border-red-200" },
            { label: "Total events (all severity)",    value: telKPIs.totalEvents,        color: "text-ink",       bg: "bg-cream border-cream-border" },
            { label: "Unique vehicles tracked",        value: telKPIs.uniqueVehicles,     color: "text-ink",       bg: "bg-cream border-cream-border" },
            { label: "Unique drivers tracked",         value: telKPIs.uniqueDrivers,      color: "text-ink",       bg: "bg-cream border-cream-border" },
            { label: "Avg events per company",         value: telKPIs.avgEventsPerCompany, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`flex items-center justify-between p-3 rounded-lg border ${bg}`}>
              <span className="text-ink-mid text-sm">{label}</span>
              <span className={`font-bold text-lg tabular-nums ${color}`}>{value}</span>
            </div>
          ))}
          <Link href="/drivers" onClick={close}
            className="flex items-center justify-center gap-2 text-forest text-sm font-medium hover:text-forest-mid transition-colors pt-2 border-t border-cream-border">
            View full driver report <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Modal>

      {/* High Severity */}
      <Modal open={modal === "highSeverity"} onClose={close} title="High-Severity Speeding Events" subtitle={`${telKPIs.highSeverityEvents} events — >20 mph over posted limit`} size="md">
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-red-700 font-bold text-3xl tabular-nums">{telKPIs.highSeverityEvents}</p>
            <p className="text-red-600 text-sm mt-0.5">high-severity events in the last 30 days</p>
          </div>
          <p className="text-ink-muted text-sm">High-severity events represent drivers exceeding the posted speed limit by more than 20 mph — the highest risk tier for accident likelihood and claims severity.</p>
          <div className="p-3 rounded-lg bg-cream border border-cream-border">
            <p className="text-ink text-sm font-medium">Top offending company</p>
            <p className="text-forest font-bold text-lg mt-0.5">{telKPIs.topCompany}</p>
            <p className="text-ink-muted text-xs">{telKPIs.topCompanyCount} events in last 30 days</p>
          </div>
          <Link href="/drivers" onClick={close}
            className="flex items-center justify-center gap-2 text-forest text-sm font-medium hover:text-forest-mid transition-colors pt-2 border-t border-cream-border">
            View driver risk report <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Modal>

      {/* Top Offender */}
      <Modal open={modal === "topOffender"} onClose={close} title="Top Offending Company" subtitle="Most speeding events in last 30 days" size="md">
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-cream border-2 border-amber-300">
            <p className="text-ink-muted text-xs uppercase tracking-wider mb-1">Top company by event count</p>
            <p className="text-ink font-bold text-xl">{telKPIs.topCompany}</p>
            <p className="text-amber-700 font-bold text-3xl tabular-nums mt-1">{telKPIs.topCompanyCount}</p>
            <p className="text-amber-600 text-sm">speeding events in last 30 days</p>
          </div>
          <p className="text-ink-muted text-sm">This company has the highest number of recorded speeding events in the current tracking period. Elevated event counts correlate with increased accident risk and potential claim activity.</p>
          <Link href="/drivers" onClick={close}
            className="flex items-center justify-center gap-2 text-forest text-sm font-medium hover:text-forest-mid transition-colors pt-2 border-t border-cream-border">
            View all drivers <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Modal>

      {/* Avg Events */}
      <Modal open={modal === "avgEvents"} onClose={close} title="Telematics Summary" subtitle="Fleet-wide averages — last 30 days" size="md">
        <div className="space-y-3">
          {[
            { label: "Average events per company", value: telKPIs.avgEventsPerCompany },
            { label: "Total unique drivers",        value: telKPIs.uniqueDrivers },
            { label: "Total unique vehicles",       value: telKPIs.uniqueVehicles },
            { label: "Total events (all severity)", value: telKPIs.totalEvents },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-cream border border-cream-border">
              <span className="text-ink-mid text-sm">{label}</span>
              <span className="font-bold text-lg tabular-nums text-ink">{value}</span>
            </div>
          ))}
          <Link href="/drivers" onClick={close}
            className="flex items-center justify-center gap-2 text-forest text-sm font-medium pt-2 border-t border-cream-border">
            Full telematics report <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Modal>
    </>
  );
}

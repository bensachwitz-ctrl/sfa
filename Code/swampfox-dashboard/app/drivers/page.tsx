"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import Modal from "@/components/Modal";
import {
  Gauge, AlertOctagon, Search, X, Activity,
  Truck, MapPin, ChevronRight, Upload, Database,
  RefreshCw, CheckCircle2, Building2, Users,
  TrendingUp, ChevronDown, ChevronUp, BarChart2,
} from "lucide-react";
import clsx from "clsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from "recharts";

const SamsaraMap = dynamic(() => import("@/components/SamsaraMap"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriverRow {
  driver: string;
  company: string;
  events: number;
  highEvents: number;
  worstOverage: number;
  lastEvent: string;
}

interface BucketRow {
  driver: string;
  company: string;
  b1: number; // 1–5 mph over
  b2: number; // 6–10
  b3: number; // 11–15
  b4: number; // 16+ (high severity)
  miles: number;
}

interface CompanySummary {
  name: string;
  totalEvents: number;
  highEvents: number;
  driverCount: number;
  topDriver: string;
  topDriverEvents: number;
  b1: number; b2: number; b3: number; b4: number;
  miles: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskLevel(highEvents: number, events: number): "High" | "Medium" | "Low" {
  if (highEvents >= 3 || events >= 15) return "High";
  if (highEvents >= 1 || events >= 5)  return "Medium";
  return "Low";
}

const RISK_BADGE: Record<string, string> = {
  High:   "text-red-700 bg-red-50 border-red-200",
  Medium: "text-amber-700 bg-amber-50 border-amber-200",
  Low:    "text-forest bg-forest/10 border-forest/30",
};

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Build speed bucket bar data
function bucketChartData(b: { b1: number; b2: number; b3: number; b4: number }) {
  return [
    { label: "1–5 mph over",  count: b.b1, fill: "#f59e0b" },
    { label: "6–10 mph over", count: b.b2, fill: "#f97316" },
    { label: "11–15 mph over",count: b.b3, fill: "#ef4444" },
    { label: "16+ mph over",  count: b.b4, fill: "#991b1b" },
  ];
}

// Inline mini bucket bar (horizontal stacked)
function BucketBar({ b1, b2, b3, b4 }: { b1: number; b2: number; b3: number; b4: number }) {
  const total = b1 + b2 + b3 + b4;
  if (total === 0) return <span className="text-ink-faint text-xs">—</span>;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-24 gap-px" title={`1-5: ${b1} | 6-10: ${b2} | 11-15: ${b3} | 16+: ${b4}`}>
      {b1 > 0 && <div style={{ width: pct(b1), background: "#f59e0b" }} />}
      {b2 > 0 && <div style={{ width: pct(b2), background: "#f97316" }} />}
      {b3 > 0 && <div style={{ width: pct(b3), background: "#ef4444" }} />}
      {b4 > 0 && <div style={{ width: pct(b4), background: "#991b1b" }} />}
    </div>
  );
}

// ── Company detail modal ──────────────────────────────────────────────────────

function CompanyDetailModal({
  company, drivers, buckets, onClose,
}: {
  company: CompanySummary;
  drivers: DriverRow[];
  buckets: BucketRow[];
  onClose: () => void;
}) {
  const compDrivers = drivers.filter((d) => d.company === company.name)
    .sort((a, b) => b.events - a.events);
  const compBuckets = buckets.filter((b) => b.company === company.name);

  const bucketTotals = compBuckets.reduce(
    (acc, b) => ({ b1: acc.b1+b.b1, b2: acc.b2+b.b2, b3: acc.b3+b.b3, b4: acc.b4+b.b4 }),
    { b1: 0, b2: 0, b3: 0, b4: 0 }
  );

  return (
    <Modal open onClose={onClose} title={company.name} subtitle="Speed Report — All Drivers" size="xl">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Events", value: company.totalEvents, color: "text-ink" },
          { label: "High Severity (16+)", value: company.highEvents, color: "text-red-600" },
          { label: "Drivers Tracked", value: company.driverCount, color: "text-forest" },
          { label: "Top Driver Events", value: company.topDriverEvents, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-cream-border bg-cream-hover p-3 text-center">
            <p className={clsx("text-xl font-bold tabular-nums", color)}>{value}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Speed bucket chart */}
      {(bucketTotals.b1 + bucketTotals.b2 + bucketTotals.b3 + bucketTotals.b4) > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Speed Bucket Breakdown</h4>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={bucketChartData(bucketTotals)} layout="vertical" margin={{ left: 80, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
              <Tooltip formatter={(v) => [v, "Events"]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {bucketChartData(bucketTotals).map((entry) => (
                  <Cell key={entry.label} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Driver table */}
      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Driver Breakdown</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-cream-border bg-cream-hover">
              {["Driver", "Events", "High Sev.", "Worst", "Speed Bands", "Risk", "Last Event"].map((h) => (
                <th key={h} className="text-left text-ink-muted font-medium px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compDrivers.map((d, i) => {
              const bk = compBuckets.find((b) => b.driver === d.driver);
              const risk = riskLevel(d.highEvents, d.events);
              return (
                <tr key={d.driver} className={clsx("border-b border-cream-border/60 hover:bg-cream-hover", i === compDrivers.length-1 && "border-b-0")}>
                  <td className="px-3 py-2.5 font-medium text-ink">{d.driver}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">{d.events}</td>
                  <td className="px-3 py-2.5">
                    {d.highEvents > 0
                      ? <span className="text-red-600 font-bold">{d.highEvents}</span>
                      : <span className="text-ink-faint">0</span>}
                  </td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">+{d.worstOverage} mph</td>
                  <td className="px-3 py-2.5">
                    {bk ? <BucketBar {...bk} /> : <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={clsx("px-2 py-0.5 rounded-full border font-medium", RISK_BADGE[risk])}>{risk}</span>
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">{fmtDate(d.lastEvent)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// ── Driver detail modal ───────────────────────────────────────────────────────

function DriverDetailModal({
  driver, buckets, onClose,
}: {
  driver: DriverRow;
  buckets: BucketRow[];
  onClose: () => void;
}) {
  const bk = buckets.find((b) => b.driver === driver.driver && b.company === driver.company);
  const risk = riskLevel(driver.highEvents, driver.events);

  return (
    <Modal open onClose={onClose} title={driver.driver} subtitle={driver.company} size="lg">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Events", value: driver.events, color: "text-ink" },
          { label: "High Severity (16+ mph)", value: driver.highEvents, color: "text-red-600" },
          { label: "Worst Overage", value: `+${driver.worstOverage} mph`, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-cream-border bg-cream-hover p-3 text-center">
            <p className={clsx("text-xl font-bold", color)}>{value}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-5">
        <span className="text-ink-muted text-xs">Risk Level:</span>
        <span className={clsx("text-xs px-3 py-1 rounded-full border font-semibold", RISK_BADGE[risk])}>{risk} Risk</span>
        <span className="text-ink-muted text-xs ml-2">Last event: {fmtDate(driver.lastEvent)}</span>
      </div>

      {bk && (
        <>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Speed Buckets</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={bucketChartData(bk)} margin={{ left: 8, right: 16, bottom: 4 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v, "Events"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {bucketChartData(bk).map((entry) => (
                  <Cell key={entry.label} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {bk.miles > 0 && (
            <p className="text-ink-muted text-xs mt-2">
              Total distance: <strong>{bk.miles.toLocaleString()} miles</strong> tracked
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

// ── Company card ──────────────────────────────────────────────────────────────

function CompanyCard({
  co, onClick,
}: {
  co: CompanySummary;
  onClick: () => void;
}) {
  const risk = riskLevel(co.highEvents, co.totalEvents);
  return (
    <button
      onClick={onClick}
      className="card-padded text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 w-full group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-ink font-semibold text-sm truncate group-hover:text-forest transition-colors">{co.name}</p>
          <p className="text-ink-muted text-[11px] mt-0.5">{co.driverCount} driver{co.driverCount !== 1 ? "s" : ""} tracked</p>
        </div>
        <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0", RISK_BADGE[risk])}>
          {risk}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[10px] text-ink-muted">Total Events</p>
          <p className={clsx("text-base font-bold tabular-nums",
            co.totalEvents >= 50 ? "text-red-600" : co.totalEvents >= 20 ? "text-amber-600" : "text-ink")}>
            {co.totalEvents}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-ink-muted">16+ mph over</p>
          <p className={clsx("text-base font-bold tabular-nums",
            co.highEvents > 0 ? "text-red-600" : "text-ink-muted")}>
            {co.highEvents}
          </p>
        </div>
      </div>

      {co.topDriver && (
        <div className="text-[11px] text-ink-muted mb-2 truncate">
          Top: <span className="text-ink font-medium">{co.topDriver}</span> — {co.topDriverEvents} events
        </div>
      )}

      <div className="flex items-center gap-2">
        <BucketBar b1={co.b1} b2={co.b2} b3={co.b3} b4={co.b4} />
        <ChevronRight className="w-3.5 h-3.5 text-ink-faint ml-auto group-hover:text-forest transition-colors" />
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SpeedReportsPage() {
  const [view,          setView]          = useState<"companies" | "drivers">("companies");
  const [riskFilter,    setRiskFilter]    = useState("All");
  const [search,        setSearch]        = useState("");
  const [sortBy,        setSortBy]        = useState<"events" | "high" | "name">("events");
  const [sortDir,       setSortDir]       = useState<"desc" | "asc">("desc");
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [allDrivers,    setAllDrivers]    = useState<DriverRow[]>([]);
  const [allBuckets,    setAllBuckets]    = useState<BucketRow[]>([]);
  const [totalEvents,   setTotalEvents]   = useState(0);
  const [highEvents,    setHighEvents]    = useState(0);
  const [dataSource,    setDataSource]    = useState<string>("mock");

  // Upload
  const [uploading,     setUploading]     = useState(false);
  const [uploadMsg,     setUploadMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showUpload,    setShowUpload]    = useState(false);

  // Modals
  const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(null);
  const [selectedDriver,  setSelectedDriver]  = useState<DriverRow | null>(null);

  async function loadData() {
    try {
      const [driversRes, bucketsRes, kpisRes, srcRes] = await Promise.all([
        fetch("/api/samsara?action=drivers"),
        fetch("/api/samsara?action=buckets"),
        fetch("/api/samsara?action=kpis&days=30"),
        fetch("/api/samsara?action=source"),
      ]);
      const [drivers, buckets, kpis, src] = await Promise.all([
        driversRes.json(), bucketsRes.json(), kpisRes.json(), srcRes.json(),
      ]);
      setAllDrivers(Array.isArray(drivers) ? drivers : []);
      setAllBuckets(Array.isArray(buckets) ? buckets : []);
      setTotalEvents(kpis?.totalEvents ?? 0);
      setHighEvents(kpis?.highSeverityEvents ?? 0);
      setDataSource(src?.source ?? "mock");
    } catch (err) {
      console.error("Speed Reports load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetch("/api/reload", { method: "POST" });
    await loadData();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("type", "samsara");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        setUploadMsg({ type: "success", text: `Uploaded ${file.name} — ${json.rows ?? "?"} rows loaded.` });
        setRefreshing(true);
        await fetch("/api/reload", { method: "POST" });
        await loadData();
      } else {
        setUploadMsg({ type: "error", text: json.error ?? "Upload failed." });
      }
    } catch {
      setUploadMsg({ type: "error", text: "Upload failed — network error." });
    } finally {
      setUploading(false); e.target.value = "";
    }
  }

  // ── Compute company summaries ────────────────────────────────────────────────
  const companies = useMemo<CompanySummary[]>(() => {
    const map = new Map<string, CompanySummary>();
    for (const d of allDrivers) {
      if (!map.has(d.company)) {
        map.set(d.company, {
          name: d.company, totalEvents: 0, highEvents: 0,
          driverCount: 0, topDriver: "", topDriverEvents: 0,
          b1: 0, b2: 0, b3: 0, b4: 0, miles: 0,
        });
      }
      const c = map.get(d.company)!;
      c.totalEvents += d.events;
      c.highEvents  += d.highEvents;
      c.driverCount++;
      if (d.events > c.topDriverEvents) { c.topDriver = d.driver; c.topDriverEvents = d.events; }
    }
    for (const b of allBuckets) {
      if (!map.has(b.company)) continue;
      const c = map.get(b.company)!;
      c.b1 += b.b1; c.b2 += b.b2; c.b3 += b.b3; c.b4 += b.b4;
      c.miles += b.miles;
    }
    return Array.from(map.values());
  }, [allDrivers, allBuckets]);

  // ── Sorting helper ────────────────────────────────────────────────────────────
  function toggleSort(col: "events" | "high" | "name") {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortDir("desc"); }
  }
  function SortIcon({ col }: { col: "events" | "high" | "name" }) {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 text-forest" />
      : <ChevronUp className="w-3 h-3 text-forest" />;
  }

  // ── Filtered & sorted results ─────────────────────────────────────────────────
  const q = search.toLowerCase();

  const filteredCompanies = useMemo(() => {
    let rows = companies;
    if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q));
    if (riskFilter !== "All") {
      const target = riskFilter as "High" | "Medium" | "Low";
      rows = rows.filter((c) => riskLevel(c.highEvents, c.totalEvents) === target);
    }
    return [...rows].sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortBy === "name")   return dir * a.name.localeCompare(b.name);
      if (sortBy === "high")   return dir * (a.highEvents - b.highEvents);
      return dir * (a.totalEvents - b.totalEvents);
    });
  }, [companies, q, riskFilter, sortBy, sortDir]);

  const filteredDrivers = useMemo(() => {
    let rows = allDrivers;
    if (q) rows = rows.filter((d) =>
      d.driver.toLowerCase().includes(q) || d.company.toLowerCase().includes(q)
    );
    if (riskFilter !== "All") {
      const target = riskFilter as "High" | "Medium" | "Low";
      rows = rows.filter((d) => riskLevel(d.highEvents, d.events) === target);
    }
    return [...rows].sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortBy === "name") return dir * a.driver.localeCompare(b.driver);
      if (sortBy === "high") return dir * (a.highEvents - b.highEvents);
      return dir * (a.events - b.events);
    });
  }, [allDrivers, q, riskFilter, sortBy, sortDir]);

  const highRiskDrivers = allDrivers.filter((d) => riskLevel(d.highEvents, d.events) === "High").length;
  const isFabric = dataSource === "fabric";

  // ── Portfolio pie data ────────────────────────────────────────────────────────
  const severityPie = [
    { name: "1–5 mph",  value: allBuckets.reduce((s, b) => s + b.b1, 0), fill: "#f59e0b" },
    { name: "6–10 mph", value: allBuckets.reduce((s, b) => s + b.b2, 0), fill: "#f97316" },
    { name: "11–15 mph",value: allBuckets.reduce((s, b) => s + b.b3, 0), fill: "#ef4444" },
    { name: "16+ mph",  value: allBuckets.reduce((s, b) => s + b.b4, 0), fill: "#991b1b" },
  ].filter((d) => d.value > 0);

  return (
    <>
      <TopBar
        title="Speed Reports"
        subtitle="Motive & Samsara fleet telematics — driver speed events, risk profiles, and company breakdowns"
      />

      <main className="page-body space-y-5">

        {/* ── Hero banner ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl px-6 py-5 flex flex-wrap items-center gap-4"
          style={{ background: "linear-gradient(135deg, #071507 0%, #0d2a0d 60%, #163816 100%)" }}>
          <Gauge className="w-8 h-8 shrink-0" style={{ color: "#8ab87a" }} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" style={{ color: "#f5f0e0" }}>Speed Reports</h2>
            <p className="text-sm mt-0.5" style={{ color: "rgba(138,184,122,0.75)" }}>
              Search any driver or company to see their full speed event history, severity breakdown, and risk profile.
              Data sourced from <strong style={{ color: "#8ab87a" }}>Motive</strong> and <strong style={{ color: "#8ab87a" }}>Samsara</strong> telematics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium",
              isFabric ? "bg-forest/30 border border-forest/40 text-green-200" : "bg-amber-900/30 border border-amber-600/30 text-amber-200")}>
              <Database className="w-3 h-3" />
              {isFabric ? "Live from Fabric SFA_OPS" : dataSource === "csv" ? "CSV data" : "Demo data"}
            </div>
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Speed Events"   value={totalEvents.toLocaleString()}
            subtext="All severity levels"          icon={Gauge}        variant="default" />
          <StatCard label="High Severity (16+ mph)" value={highEvents.toLocaleString()}
            subtext="Most dangerous events"        icon={AlertOctagon}
            variant={highEvents > 20 ? "danger" : "warning"} />
          <StatCard label="High-Risk Drivers"    value={highRiskDrivers}
            subtext="3+ high-severity events"      icon={Users}
            variant={highRiskDrivers > 0 ? "danger" : "default"} />
          <StatCard label="Companies Tracked"    value={companies.length}
            subtext={`${allDrivers.length} drivers total`} icon={Building2} variant="default" />
        </div>

        {/* ── Speed Severity Summary ───────────────────────────────────────────── */}
        {severityPie.length > 0 && (
          <div className="card-padded">
            <h3 className="section-header flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-forest" /> Portfolio Speed Severity
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={220} height={160}>
                <PieChart>
                  <Pie data={severityPie} dataKey="value" nameKey="name"
                    innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {severityPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Events"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {severityPie.map((s) => (
                  <div key={s.name} className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.fill }} />
                    <div>
                      <p className="text-xs font-semibold text-ink">{s.name}</p>
                      <p className="text-[11px] text-ink-muted">{s.value.toLocaleString()} events</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Search + View Toggle + Filters ──────────────────────────────────── */}
        <div className="card-padded space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={view === "drivers" ? "Search driver name or company…" : "Search company…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-9 text-xs py-2 w-full"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-cream-border overflow-hidden bg-cream-hover shrink-0">
              {(["companies", "drivers"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors",
                    view === v ? "bg-forest text-cream-card" : "text-ink-muted hover:text-ink"
                  )}
                >
                  {v === "companies" ? <Building2 className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Risk filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-ink-muted text-xs shrink-0">Risk:</span>
              {["All", "High", "Medium", "Low"].map((r) => (
                <button key={r} onClick={() => setRiskFilter(r)}
                  className={clsx("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    riskFilter === r ? "pill-active" : "pill-inactive")}>
                  {r}
                </button>
              ))}
            </div>

            {(search || riskFilter !== "All") && (
              <button onClick={() => { setSearch(""); setRiskFilter("All"); }}
                className="flex items-center gap-1 text-ink-muted hover:text-red-600 text-xs transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}

            {/* Upload + Refresh */}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleRefresh} disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-cream-hover border border-cream-border text-ink-mid hover:text-forest transition-colors disabled:opacity-50">
                <RefreshCw className={clsx("w-3 h-3", refreshing && "animate-spin")} />
                Refresh
              </button>
              <button onClick={() => setShowUpload((v) => !v)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors",
                  showUpload ? "bg-forest text-cream-card border-forest" : "bg-forest/10 border-forest/30 text-forest hover:bg-forest/20"
                )}>
                <Upload className="w-3 h-3" />
                Upload CSV
              </button>
            </div>
          </div>

          {/* CSV Upload panel */}
          {showUpload && (
            <div className="pt-3 border-t border-cream-border space-y-3">
              <p className="text-ink-muted text-xs">
                Upload a Samsara or Motive CSV export. Supports individual safety events or the aggregated
                gold_speeding_driver_daily format (company_key, driver_name, bucket_1_5_count…).
              </p>
              <label className={clsx(
                "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors",
                uploading ? "opacity-60 pointer-events-none" : "hover:border-forest/50 hover:bg-forest/5"
              )}>
                <Upload className="w-6 h-6 text-forest/50" />
                <span className="text-ink-mid text-sm font-medium">
                  {uploading ? "Uploading…" : "Click to select CSV"}
                </span>
                <input type="file" accept=".csv" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              {uploadMsg && (
                <div className={clsx(
                  "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
                  uploadMsg.type === "success" ? "bg-forest/10 text-forest border border-forest/20" : "bg-red-50 text-red-700 border border-red-200"
                )}>
                  {uploadMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertOctagon className="w-4 h-4 shrink-0" />}
                  {uploadMsg.text}
                </div>
              )}
            </div>
          )}

          {/* Result count */}
          <p className="text-ink-faint text-xs">
            {view === "companies"
              ? `${filteredCompanies.length} of ${companies.length} companies`
              : `${filteredDrivers.length} of ${allDrivers.length} drivers`}
            {search && <> matching <strong className="text-ink-mid">"{search}"</strong></>}
          </p>
        </div>

        {loading ? (
          <div className="card-padded text-center py-16 text-ink-muted">
            <div className="w-8 h-8 border-2 border-forest/30 border-t-forest rounded-full animate-spin mx-auto mb-3" />
            Loading speed report data…
          </div>
        ) : (
          <>
            {/* ── Companies view ─────────────────────────────────────────────── */}
            {view === "companies" && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="section-header flex items-center gap-2 flex-1">
                    <Building2 className="w-4 h-4 text-forest" /> Company Breakdown
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-muted text-xs">Sort:</span>
                    {[
                      { key: "events" as const, label: "Events" },
                      { key: "high"   as const, label: "High Sev." },
                      { key: "name"   as const, label: "Name" },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => toggleSort(key)}
                        className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors border",
                          sortBy === key ? "bg-forest/10 border-forest/30 text-forest" : "border-cream-border text-ink-muted hover:text-ink")}>
                        {label} <SortIcon col={key} />
                      </button>
                    ))}
                  </div>
                </div>

                {filteredCompanies.length === 0 ? (
                  <div className="card-padded text-center py-12 text-ink-muted text-sm">
                    No companies match your filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredCompanies.map((co) => (
                      <CompanyCard key={co.name} co={co} onClick={() => setSelectedCompany(co)} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Drivers view ───────────────────────────────────────────────── */}
            {view === "drivers" && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="section-header flex items-center gap-2 flex-1">
                    <Activity className="w-4 h-4 text-forest" /> Driver Leaderboard
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-muted text-xs">Sort:</span>
                    {[
                      { key: "events" as const, label: "Events" },
                      { key: "high"   as const, label: "High Sev." },
                      { key: "name"   as const, label: "Name" },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => toggleSort(key)}
                        className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors border",
                          sortBy === key ? "bg-forest/10 border-forest/30 text-forest" : "border-cream-border text-ink-muted hover:text-ink")}>
                        {label} <SortIcon col={key} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop table */}
                <div className="card overflow-hidden hidden lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-border bg-cream-hover">
                        <th className="text-left text-ink-muted text-xs font-medium px-4 py-3 w-8">#</th>
                        {["Driver", "Company", "Events", "High Sev.", "Worst Overage", "Speed Bands", "Last Event", "Risk"].map((h) => (
                          <th key={h} className="text-left text-ink-muted text-xs font-medium px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrivers.length === 0 ? (
                        <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-muted text-sm">No drivers match filters.</td></tr>
                      ) : filteredDrivers.map((d, i) => {
                        const bk = allBuckets.find((b) => b.driver === d.driver && b.company === d.company);
                        const risk = riskLevel(d.highEvents, d.events);
                        return (
                          <tr key={`${d.driver}|${d.company}`}
                            onClick={() => setSelectedDriver(d)}
                            className={clsx(
                              "border-b border-cream-border/60 hover:bg-cream-hover transition-colors cursor-pointer",
                              i === filteredDrivers.length - 1 && "border-b-0"
                            )}>
                            <td className="px-4 py-3 text-ink-faint text-xs tabular-nums">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-forest/10 flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-forest">
                                    {d.driver.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-ink font-medium text-xs">{d.driver}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-ink-mid text-xs truncate max-w-[140px]">{d.company}</td>
                            <td className="px-4 py-3">
                              <span className={clsx("text-xs font-bold tabular-nums",
                                d.events >= 15 ? "text-red-600" : d.events >= 5 ? "text-amber-600" : "text-ink")}>
                                {d.events}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {d.highEvents > 0
                                ? <span className="text-xs font-bold text-red-600">{d.highEvents}</span>
                                : <span className="text-ink-faint text-xs">0</span>}
                            </td>
                            <td className="px-4 py-3 text-ink text-xs font-semibold tabular-nums">
                              +{d.worstOverage} mph
                            </td>
                            <td className="px-4 py-3">
                              {bk ? <BucketBar {...bk} /> : <span className="text-ink-faint text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-ink-mid text-xs">{fmtDate(d.lastEvent)}</td>
                            <td className="px-4 py-3">
                              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium", RISK_BADGE[risk])}>
                                {risk}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2 lg:hidden">
                  {filteredDrivers.map((d) => {
                    const bk = allBuckets.find((b) => b.driver === d.driver && b.company === d.company);
                    const risk = riskLevel(d.highEvents, d.events);
                    return (
                      <button key={`${d.driver}|${d.company}`}
                        onClick={() => setSelectedDriver(d)}
                        className="card-padded text-left w-full hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-ink font-semibold text-sm">{d.driver}</p>
                            <p className="text-ink-muted text-xs mt-0.5">{d.company}</p>
                          </div>
                          <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium", RISK_BADGE[risk])}>
                            {risk}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                          <div><p className="text-ink-muted">Events</p><p className="font-bold">{d.events}</p></div>
                          <div><p className="text-ink-muted">High Sev.</p>
                            <p className={d.highEvents > 0 ? "text-red-600 font-bold" : "text-ink-mid"}>{d.highEvents}</p></div>
                          <div><p className="text-ink-muted">Worst</p><p className="font-semibold">+{d.worstOverage} mph</p></div>
                        </div>
                        {bk && <div className="mt-3 flex items-center gap-2"><BucketBar {...bk} /></div>}
                      </button>
                    );
                  })}
                </div>

                {/* Risk summary row */}
                <div className="card-padded bg-cream border border-cream-border mt-1">
                  <div className="flex flex-wrap gap-6 text-xs">
                    <span className="text-ink-mid"><span className="font-semibold text-red-600">{highRiskDrivers}</span> high-risk</span>
                    <span className="text-ink-mid">
                      <span className="font-semibold text-amber-600">
                        {allDrivers.filter((d) => riskLevel(d.highEvents, d.events) === "Medium").length}
                      </span> medium-risk
                    </span>
                    <span className="text-ink-mid">
                      <span className="font-semibold text-forest">
                        {allDrivers.filter((d) => riskLevel(d.highEvents, d.events) === "Low").length}
                      </span> low-risk
                    </span>
                    <span className="text-ink-faint ml-auto">
                      {isFabric ? "Source: Fabric SFA_OPS" : dataSource === "csv" ? "Source: CSV upload" : "Source: demo data"}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ── Map ────────────────────────────────────────────────────────── */}
            <section>
              <h2 className="section-header flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest" /> Speed Events Map
              </h2>
              <div className="card overflow-hidden">
                <SamsaraMap height={480} showFilters={true} />
              </div>
              <p className="text-ink-faint text-xs mt-2 px-1">
                Amber = 1–10 mph over · Orange = 10–15 mph over · Red = 16+ mph over posted limit.
                Click any marker for driver, vehicle, and event details.
              </p>
            </section>
          </>
        )}
      </main>

      {/* ── Company detail modal ────────────────────────────────────────────── */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          drivers={allDrivers}
          buckets={allBuckets}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {/* ── Driver detail modal ─────────────────────────────────────────────── */}
      {selectedDriver && (
        <DriverDetailModal
          driver={selectedDriver}
          buckets={allBuckets}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </>
  );
}

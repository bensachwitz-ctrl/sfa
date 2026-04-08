"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { getRiskAlerts } from "@/lib/clientData";
import {
  AlertTriangle, Users, Shield, Bell, Building2,
  ChevronRight, ArrowRight, Truck,
  AlertCircle, DollarSign, ShieldAlert, Gauge, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const SEVERITY_BORDER: Record<string, string> = {
  high:   "border-l-red-500",
  medium: "border-l-amber-500",
  low:    "border-l-cream-border",
};

const SEVERITY_BADGE: Record<string, string> = {
  high:   "text-red-700 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low:    "text-ink-mid bg-cream-hover border-cream-border",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  open_claims:   AlertCircle,
  high_incurred: DollarSign,
  safer:         Shield,
  oos_rate:      Truck,
  speeding:      Gauge,
  renewal:       RefreshCw,
};

const TYPE_LABEL: Record<string, string> = {
  open_claims:   "Open Claims",
  high_incurred: "High Losses",
  safer:         "SAFER Rating",
  oos_rate:      "OOS Rate",
  speeding:      "Speeding",
  renewal:       "Renewal",
};

export default function RiskAlertsPage() {
  const router = useRouter();
  const [filterType, setFilterType]         = useState<string>("All");
  const [filterSeverity, setFilterSeverity] = useState<string>("All");

  const alerts = useMemo(() => getRiskAlerts(), []);

  const filtered = alerts.filter((a) => {
    if (filterType !== "All"     && a.type     !== filterType)     return false;
    if (filterSeverity !== "All" && a.severity !== filterSeverity) return false;
    return true;
  });

  const high              = alerts.filter((a) => a.severity === "high").length;
  const medium            = alerts.filter((a) => a.severity === "medium").length;
  const companiesAffected = new Set(alerts.map((a) => a.companyId)).size;

  return (
    <>
      <TopBar
        title="Risk Alerts"
        subtitle="Open claims · high incurred · SAFER flags · OOS rate issues · speeding events · policy renewals"
      />

      <main className="page-body space-y-6">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Alerts"        value={alerts.length}
            subtext="Requiring attention" icon={Bell} variant="danger" />
          <StatCard label="High-Severity"       value={high}
            subtext="Immediate action needed" icon={ShieldAlert} variant="danger" />
          <StatCard label="Medium-Severity"     value={medium}
            subtext="Review within 5 days" icon={AlertTriangle} variant="warning" />
          <StatCard label="Companies Affected"  value={companiesAffected}
            subtext="With one or more alerts" icon={Building2}
            variant={companiesAffected > 10 ? "warning" : "default"} />
        </div>

        {/* ── Filters ── */}
        <div className="card-padded">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-ink-muted text-xs font-medium">Severity:</span>
            {["All", "high", "medium"].map((s) => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className={clsx("px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                  filterSeverity === s ? "pill-active" : "pill-inactive")}>
                {s}
              </button>
            ))}
            <div className="h-4 w-px bg-cream-border hidden sm:block" />
            <span className="text-ink-muted text-xs font-medium">Type:</span>
            {["All", "open_claims", "high_incurred", "safer", "oos_rate", "speeding", "renewal"].map((t) => (
              <button key={t} onClick={() => setFilterType(t)}
                className={clsx("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  filterType === t ? "pill-active" : "pill-inactive")}>
                {t === "All" ? "All" : TYPE_LABEL[t]}
              </button>
            ))}
            <span className="text-ink-faint text-xs ml-auto hidden lg:block">
              {filtered.length} of {alerts.length} alerts
            </span>
          </div>
        </div>

        {/* ── Alert Feed ── */}
        {filtered.length === 0 ? (
          <div className="card-padded text-center text-ink-muted py-10">
            No alerts match the current filters.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alert) => {
              const Icon = TYPE_ICONS[alert.type] ?? AlertTriangle;
              return (
                <div key={alert.id}
                  className={clsx("card-padded flex items-center gap-4 border-l-4 hover:bg-cream-hover transition-colors cursor-pointer",
                    SEVERITY_BORDER[alert.severity])}
                  onClick={() => router.push(`/companies/${encodeURIComponent(alert.companyId)}`)}>
                  <div className="w-9 h-9 rounded-full bg-cream-hover flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-ink-mid" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-ink font-semibold text-sm">{alert.companyName}</p>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", SEVERITY_BADGE[alert.severity])}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-hover text-ink-mid border border-cream-border">
                        {TYPE_LABEL[alert.type]}
                      </span>
                    </div>
                    <p className="text-forest text-xs font-medium">{alert.title}</p>
                    <p className="text-ink-mid text-xs mt-0.5">{alert.detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* ── Quick Actions ── */}
        <section>
          <h2 className="section-header">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/claims"
              className="card-padded flex items-center justify-between hover:bg-cream-hover transition-colors group">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-ink text-sm font-medium">Review Open Claims</p>
                  <p className="text-ink-muted text-xs">{high + medium} high/medium alerts active</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-faint group-hover:text-forest transition-colors" />
            </Link>
            <Link href="/companies"
              className="card-padded flex items-center justify-between hover:bg-cream-hover transition-colors group">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-ink text-sm font-medium">Company Risk Review</p>
                  <p className="text-ink-muted text-xs">Sort by risk score</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-faint group-hover:text-forest transition-colors" />
            </Link>
            <Link href="/drivers"
              className="card-padded flex items-center justify-between hover:bg-cream-hover transition-colors group">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-violet-600" />
                <div>
                  <p className="text-ink text-sm font-medium">Driver Risk & Telematics</p>
                  <p className="text-ink-muted text-xs">Samsara speeding events &amp; map</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-faint group-hover:text-forest transition-colors" />
            </Link>
          </div>
        </section>

        {/* ── Alert Definitions ── */}
        <div className="card-padded bg-cream">
          <p className="text-ink-muted text-xs font-medium uppercase tracking-wider mb-3">Alert Definitions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink-mid">
            <div className="flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <span><strong className="text-ink">Open Claims:</strong> 4+ open = High · 2–3 open = Medium</span>
            </div>
            <div className="flex gap-2">
              <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span><strong className="text-ink">High Losses:</strong> $2M+ incurred = High · $1M+ = Medium</span>
            </div>
            <div className="flex gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span><strong className="text-ink">SAFER Rating:</strong> Conditional or Unsatisfactory rating on file</span>
            </div>
            <div className="flex gap-2">
              <Truck className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
              <span><strong className="text-ink">OOS Rate:</strong> Vehicle out-of-service rate &gt; 20%</span>
            </div>
            <div className="flex gap-2">
              <Gauge className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5" />
              <span><strong className="text-ink">Speeding:</strong> &gt;15 events/30d = High · &gt;5 events = Medium</span>
            </div>
            <div className="flex gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
              <span><strong className="text-ink">Renewal:</strong> Overdue = High · due within 30 days = Medium</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

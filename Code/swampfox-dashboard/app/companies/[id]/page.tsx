"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import ClaimsByYearChart from "@/components/charts/ClaimsByYearChart";
import ClaimsByCategoryChart from "@/components/charts/ClaimsByCategoryChart";
import LineOfBusinessChart from "@/components/charts/LineOfBusinessChart";
import PortfolioIncurredChart from "@/components/charts/PortfolioIncurredChart";
import { getCompanyByName } from "@/lib/clientData";
import { getSpeedingByCompany } from "@/lib/samsaraData";

const SamsaraMap = dynamic(() => import("@/components/SamsaraMap"), { ssr: false });
import {
  ArrowLeft, Building2, Truck, FileText, ExternalLink,
  AlertTriangle, MapPin, Activity, ShieldCheck,
  ShieldAlert, AlertCircle, ChevronDown, ChevronUp,
  Info, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import clsx from "clsx";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function ChartCard({ title, subtitle, children, height = "240px" }: {
  title: string; subtitle?: string; children: React.ReactNode; height?: string;
}) {
  return (
    <div className="card-padded">
      <div className="mb-4">
        <p className="text-ink font-semibold text-sm">{title}</p>
        {subtitle && <p className="text-ink-muted text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
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

function SaferBadge({ rating }: { rating: string }) {
  const unknown = !rating || ["Unknown", "None", "Not Found", ""].includes(rating);
  if (unknown) return <span className="text-ink-muted text-sm font-medium">Not on file</span>;
  const isGood = rating.toLowerCase().includes("satisfactory") && !rating.toLowerCase().includes("un");
  const isBad  = rating.toLowerCase().includes("unsatisfactory");
  const isCond = rating.toLowerCase().includes("conditional");
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
      isGood ? "text-forest bg-forest/10 border-forest/30" :
      isBad  ? "text-red-700 bg-red-50 border-red-200" :
      isCond ? "text-amber-700 bg-amber-50 border-amber-200" :
               "text-ink-mid bg-cream-hover border-cream-border")}>
      {isGood ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {rating}
    </span>
  );
}

function OOSIndicator({ rate, label }: { rate: number | null; label: string }) {
  const isHigh = (rate ?? 0) > 15;
  const isMed  = (rate ?? 0) > 5;
  const Icon   = isHigh ? TrendingUp : isMed ? Minus : TrendingDown;
  return (
    <div className="flex items-center gap-2">
      <Icon className={clsx("w-3.5 h-3.5 shrink-0", isHigh ? "text-red-500" : isMed ? "text-amber-500" : "text-forest")} />
      <span className={clsx("text-sm font-bold",
        isHigh ? "text-red-600" : isMed ? "text-amber-600" : "text-forest")}>
        {rate !== null ? `${rate.toFixed(1)}%` : "—"}
      </span>
      {isHigh && <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Above threshold</span>}
    </div>
  );
}

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [showAllClaims,   setShowAllClaims]   = useState(false);
  const [claimSortField,  setClaimSortField]  = useState<"date" | "incurred">("date");
  const [statusFilter,    setStatusFilter]    = useState<"All" | "Open" | "Closed">("All");
  const [dotExpanded,     setDotExpanded]     = useState(false);

  const data = useMemo(
    () => (id ? getCompanyByName(decodeURIComponent(id)) : null),
    [id]
  );

  if (!data) {
    return (
      <>
        <TopBar title="Not Found" />
        <main className="page-body flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-600" />
            <p className="text-ink font-medium">Company not found</p>
            <p className="text-ink-muted text-sm">{decodeURIComponent(id ?? "")}</p>
            <button onClick={() => router.push("/companies")}
              className="text-forest text-sm hover:underline">
              Back to Companies
            </button>
          </div>
        </main>
      </>
    );
  }

  const filteredClaims = data.claims
    .filter((c) => statusFilter === "All" || c.status === statusFilter)
    .sort((a, b) =>
      claimSortField === "date"
        ? b.dateOfLoss.localeCompare(a.dateOfLoss)
        : b.totalIncurred - a.totalIncurred
    );
  const displayedClaims = showAllClaims ? filteredClaims : filteredClaims.slice(0, 20);

  const totalIncurred = data.claims.reduce((s, c) => s + c.totalIncurred, 0);
  const totalPaid     = data.claims.reduce((s, c) => s + c.totalPaid, 0);
  const totalReserved = data.claims.reduce((s, c) => s + c.totalReserve, 0);
  const openCount     = data.claims.filter((c) => c.status === "Open").length;

  const paidVsReservedByYear = data.claimsByYear.map((y) => ({
    year: String(y.year), paid: y.paid, reserved: y.reserved, incurred: y.incurred, claims: y.count,
  }));

  const hasDotData = data.vehicleInspections > 0 || data.driverInspections > 0;

  return (
    <>
      <TopBar
        title={data.name}
        subtitle={[data.dot ? `DOT #${data.dot}` : null, data.address || null].filter(Boolean).join(" · ") || "Company Profile"}
      />

      <main className="page-body space-y-6">
        <button onClick={() => router.push("/companies")}
          className="flex items-center gap-2 text-ink-muted hover:text-forest text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Companies
        </button>

        {/* ── Company Header ── */}
        <div className="card-padded">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-forest" />
              </div>
              <div>
                <h2 className="text-ink font-bold text-xl">{data.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  {data.dot && (
                    <span className="flex items-center gap-1.5 text-ink-mid text-xs">
                      <Truck className="w-3.5 h-3.5" /> DOT #{data.dot}
                    </span>
                  )}
                  {data.address && (
                    <span className="flex items-center gap-1.5 text-ink-mid text-xs">
                      <MapPin className="w-3.5 h-3.5" /> {data.address}
                    </span>
                  )}
                  {data.states.length > 0 && (
                    <span className="text-ink-muted text-xs">Operating states: {data.states.join(", ")}</span>
                  )}
                  {data.carriers.length > 0 && (
                    <span className="text-ink-muted text-xs">Carriers: {data.carriers.join(", ")}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {data.riskScore >= 60 && (
                    <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <ShieldAlert className="w-3 h-3" /> High Risk — Score {data.riskScore}
                    </span>
                  )}
                  {data.operatingStatus && data.operatingStatus !== "Unknown" && (
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border",
                      data.operatingStatus.toUpperCase().includes("ACTIVE")
                        ? "text-forest bg-forest/10 border-forest/30"
                        : "text-ink-mid bg-cream-hover border-cream-border")}>
                      {data.operatingStatus.length > 30 ? data.operatingStatus.slice(0, 28) + "…" : data.operatingStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {data.dot && (
              <a href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${data.dot}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-forest hover:text-forest-mid text-xs border border-forest/30 bg-forest/8 px-3 py-1.5 rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View on SAFER.FMCSA.gov
              </a>
            )}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-cream-border">
            {[
              { label: "Total Claims", value: data.claims.length, color: "text-ink" },
              { label: "Open Claims",  value: openCount,          color: openCount > 3 ? "text-red-600" : openCount > 0 ? "text-amber-600" : "text-forest" },
              { label: "Total Incurred", value: fmt(totalIncurred), color: "text-orange-700" },
              { label: "Total Paid",    value: fmt(totalPaid),      color: "text-forest" },
              { label: "Open Reserves", value: totalReserved > 0 ? fmt(totalReserved) : "$0", color: totalReserved > 0 ? "text-amber-700" : "text-ink-muted" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-cream rounded-lg p-3 border border-cream-border">
                <p className="text-ink-muted text-xs mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── DOT & Safety Health ── */}
        {hasDotData && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-header mb-0 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-forest" /> DOT &amp; Safety Health
              </h2>
              <button onClick={() => setDotExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-forest transition-colors">
                <Info className="w-3.5 h-3.5" />
                {dotExpanded ? "Collapse" : "Expand details"}
              </button>
            </div>

            <div className="card-padded">
              {/* SAFER Rating + summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-ink-muted text-xs mb-1.5">SAFER Rating</p>
                  <SaferBadge rating={data.saferRating} />
                  {data.dot && (
                    <a href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${data.dot}`}
                      target="_blank" rel="noopener noreferrer"
                      className="block text-[10px] text-forest hover:underline mt-1.5">
                      Verify on FMCSA
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-ink-muted text-xs mb-1.5">Vehicle OOS Rate</p>
                  <OOSIndicator rate={data.vehicleOOSRate} label="Vehicle" />
                  <p className="text-[10px] text-ink-muted mt-1">{data.vehicleInspections} inspections on file</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs mb-1.5">Driver OOS Rate</p>
                  <OOSIndicator rate={data.driverOOSRate} label="Driver" />
                  <p className="text-[10px] text-ink-muted mt-1">{data.driverInspections} inspections on file</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs mb-1.5">Operating Status</p>
                  <p className="text-sm font-semibold text-ink">
                    {data.operatingStatus && data.operatingStatus !== "Unknown"
                      ? (data.operatingStatus.length > 25 ? data.operatingStatus.slice(0, 23) + "…" : data.operatingStatus)
                      : "Not on file"}
                  </p>
                </div>
              </div>

              {dotExpanded && (
                <div className="pt-4 border-t border-cream-border space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink-mid">
                    <div className="bg-cream rounded-lg p-3 border border-cream-border">
                      <p className="font-semibold text-ink mb-1">What is a SAFER Rating?</p>
                      <p className="leading-relaxed">The FMCSA assigns safety ratings based on compliance reviews: <strong>Satisfactory</strong> indicates the carrier meets safety standards; <strong>Conditional</strong> means deficiencies were found that are not critical; <strong>Unsatisfactory</strong> means serious violations were identified and the carrier is prohibited from operating.</p>
                      <p className="mt-2 text-ink-muted">Out-of-service (OOS) rates above 20% for vehicles or 6% for drivers are above national averages and warrant underwriting review.</p>
                    </div>
                    <div className="bg-cream rounded-lg p-3 border border-cream-border">
                      <p className="font-semibold text-ink mb-1">Insurance Implications</p>
                      <p className="leading-relaxed">A Conditional or Unsatisfactory rating significantly increases accident risk and may affect coverage eligibility. OOS violations indicate vehicles or drivers are operating while failing safety inspections — a direct predictor of claim severity.</p>
                      <p className="mt-2">DOT #: <span className="font-mono text-ink">{data.dot || "Not on file"}</span></p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Charts ── */}
        <section>
          <h2 className="section-header flex items-center gap-2">
            <Activity className="w-4 h-4 text-forest" /> Loss Analytics
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <ChartCard title="Claims Volume & Incurred by Year"
                subtitle="Claim count (bars) · total incurred (orange line)" height="260px">
                <ClaimsByYearChart data={data.claimsByYear} />
              </ChartCard>
            </div>
            <div>
              <ChartCard title="Line of Business" subtitle="Incurred by coverage line" height="260px">
                <LineOfBusinessChart data={data.claimsByLine} mode="incurred" />
              </ChartCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Loss Categories" subtitle="Top categories by total incurred" height="240px">
              <ClaimsByCategoryChart data={data.claimsByCategory} mode="incurred" />
            </ChartCard>
            <ChartCard title="Paid vs. Reserved — Year Over Year"
              subtitle="Paid losses (green) · open reserves (amber)" height="240px">
              <PortfolioIncurredChart data={paidVsReservedByYear} />
            </ChartCard>
          </div>
        </section>

        {/* ── Samsara Telematics ── */}
        {(() => {
          const companyName = decodeURIComponent(id ?? "");
          const companyEvents = getSpeedingByCompany(companyName);
          return (
            <section>
              <h2 className="section-header flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest" /> Driver &amp; Telematics Data
              </h2>
              {companyEvents.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="card-padded text-center">
                      <p className="text-2xl font-bold text-ink tabular-nums">{companyEvents.length}</p>
                      <p className="text-ink-muted text-xs mt-1">Total speeding events</p>
                    </div>
                    <div className="card-padded text-center">
                      <p className="text-2xl font-bold text-red-600 tabular-nums">
                        {companyEvents.filter((e) => e.severity === "high").length}
                      </p>
                      <p className="text-ink-muted text-xs mt-1">High severity (&gt;20 mph over)</p>
                    </div>
                    <div className="card-padded text-center">
                      <p className="text-2xl font-bold text-ink tabular-nums">
                        {Math.max(...companyEvents.map((e) => e.overage_mph))}
                      </p>
                      <p className="text-ink-muted text-xs mt-1">Max overage (mph)</p>
                    </div>
                  </div>
                  <div className="card overflow-hidden">
                    <SamsaraMap events={companyEvents} company={companyName} height={360} showFilters={true} />
                  </div>
                </>
              ) : (
                <div className="card-padded border-l-4 border-l-cream-deep">
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" />
                    <div>
                      <p className="text-ink font-medium text-sm">No telematics data for this company</p>
                      <p className="text-ink-muted text-xs mt-0.5">
                        This insured does not appear in the Samsara fleet data. When connected via the Fabric SQL endpoint, GPS-tagged speeding events will appear here.
                      </p>
                      <a href="/drivers" className="inline-flex items-center gap-1 text-forest text-xs mt-2 hover:underline">
                        View fleet-wide telematics <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* ── Claims History ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-header mb-0 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Claims History ({data.claims.length})
            </h2>
            <div className="flex items-center gap-2">
              {(["All", "Open", "Closed"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={clsx("px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    statusFilter === s ? "pill-active" : "pill-inactive")}>
                  {s}
                </button>
              ))}
              <button onClick={() => setClaimSortField((f) => f === "date" ? "incurred" : "date")}
                className="flex items-center gap-1 text-ink-muted hover:text-forest text-xs transition-colors ml-1 border border-cream-border px-2 py-1 rounded-lg">
                Sort: {claimSortField === "date" ? "Date" : "Incurred"}
              </button>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-cream-border bg-cream-hover">
                  {["Claim #", "Line", "Category", "Date of Loss", "State", "Driver", "Status", "Paid", "Reserved", "Incurred"].map((h) => (
                    <th key={h} className="text-left text-ink-muted text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedClaims.map((c, i) => (
                  <tr key={c.claimNumber} className={clsx(
                    "border-b border-cream-border/60 hover:bg-cream-hover transition-colors",
                    i === displayedClaims.length - 1 && "border-0",
                    c.status === "Open" && "bg-red-50/40"
                  )}>
                    <td className="px-4 py-3 font-mono text-xs text-ink-mid">{c.claimNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LINE_STYLES[c.line] ?? ""}`}>{c.line}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-mid text-xs max-w-[120px] truncate" title={c.category}>{c.category}</td>
                    <td className="px-4 py-3 text-ink-muted text-xs">{c.dateOfLoss}</td>
                    <td className="px-4 py-3 text-ink-muted text-xs">{c.state}</td>
                    <td className="px-4 py-3 text-ink-muted text-xs max-w-[100px] truncate">{c.driver || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[c.status] ?? ""}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-ink text-xs font-medium">{c.totalPaid > 0 ? fmt(c.totalPaid) : "—"}</td>
                    <td className="px-4 py-3 text-amber-700 text-xs font-medium">{c.totalReserve > 0 ? fmt(c.totalReserve) : "—"}</td>
                    <td className="px-4 py-3 text-orange-700 text-xs font-semibold">{c.totalIncurred > 0 ? fmt(c.totalIncurred) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-cream-border bg-cream-hover">
                  <td colSpan={7} className="px-4 py-2.5 text-ink-mid text-xs font-medium">
                    {filteredClaims.length} claims{statusFilter !== "All" ? ` (${statusFilter})` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-forest font-bold text-xs">{fmt(totalPaid)}</td>
                  <td className="px-4 py-2.5 text-amber-700 font-bold text-xs">{totalReserved > 0 ? fmt(totalReserved) : "—"}</td>
                  <td className="px-4 py-2.5 text-orange-700 font-bold text-xs">{fmt(totalIncurred)}</td>
                </tr>
              </tfoot>
            </table>

            {filteredClaims.length > 20 && (
              <div className="border-t border-cream-border">
                <button onClick={() => setShowAllClaims((v) => !v)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-ink-muted hover:text-forest text-xs transition-colors">
                  {showAllClaims ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Show all {filteredClaims.length} claims</>
                  )}
                </button>
              </div>
            )}
          </div>

          {data.claims.some((c) => c.status === "Open" && c.accidentDesc) && (
            <div className="card-padded mt-3 border-l-4 border-l-red-400 bg-red-50/40">
              <p className="text-red-700 font-semibold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Open Claim Details
              </p>
              <div className="space-y-3">
                {data.claims.filter((c) => c.status === "Open" && c.accidentDesc).map((c) => (
                  <div key={c.claimNumber} className="grid grid-cols-[auto_1fr] gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-mono text-ink-mid">{c.claimNumber}</p>
                      <p className="text-ink-muted">{c.dateOfLoss}</p>
                      <p className="text-amber-700 font-medium">{fmt(c.totalIncurred)}</p>
                    </div>
                    <div>
                      <p className="text-ink-mid">{c.accidentDesc}</p>
                      {c.driver   && <p className="text-ink-muted mt-0.5">Driver: {c.driver}</p>}
                      {c.claimant && <p className="text-ink-muted">Claimant: {c.claimant}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

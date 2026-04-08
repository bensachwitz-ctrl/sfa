"use client";

import { format } from "date-fns";
import { RefreshCw, Bell, Database, WifiOff } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import { useEffect, useState } from "react";

interface FabricStatusData {
  connected?: boolean;
  samsaraConnected?: boolean;
  configured?: boolean;
  claimCount?: number | null;
  samsaraCount?: number | null;
}

function FabricIndicator() {
  const [data, setData] = useState<FabricStatusData | null>(null);

  useEffect(() => {
    fetch("/api/fabric/status")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({}));
  }, []);

  if (!data) return null;

  const claimsOk  = !!data.connected;
  const samsaraOk = !!data.samsaraConnected;
  const anyLive   = claimsOk || samsaraOk;
  const configured = !!data.configured;

  if (anyLive) {
    const tooltip = [
      claimsOk  ? `Claims: ${data.claimCount?.toLocaleString() ?? "??"} rows (RawLakeHouse)` : "Claims: offline",
      samsaraOk ? `Samsara: ${data.samsaraCount?.toLocaleString() ?? "??"} rows (SFA_OPS)` : "Samsara: offline",
    ].join(" | ");
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-forest/10 border border-forest/20 cursor-default" title={tooltip}>
        <Database className="w-3 h-3 text-forest" />
        <span className="text-[10px] font-medium text-forest hidden sm:inline">Fabric Live</span>
        {samsaraOk && <span className="text-[10px] text-forest hidden md:inline">+ Samsara</span>}
        <div className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
      </div>
    );
  }

  if (configured) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 cursor-default"
           title="Fabric credentials not set or connection failed — using local demo data">
        <WifiOff className="w-3 h-3 text-amber-600" />
        <span className="text-[10px] font-medium text-amber-700 hidden sm:inline">Fabric offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cream-hover border border-cream-border cursor-default"
         title="No Fabric credentials set — using local demo data">
      <Database className="w-3 h-3 text-ink-muted" />
      <span className="text-[10px] text-ink-muted hidden sm:inline">Local data</span>
    </div>
  );
}

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const now = new Date();

  return (
    <header className="min-h-16 border-b border-cream-border bg-cream-card/90 backdrop-blur-sm flex flex-wrap items-center px-6 gap-3 sticky top-0 z-40 py-2"
      style={{ boxShadow: "0 1px 4px rgba(45,90,45,0.06)" }}>

      {/* ── Page Title ── */}
      <div className="shrink-0 w-44 hidden lg:block">
        <h1 className="text-ink font-semibold text-base leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-ink-muted text-[11px] truncate">{subtitle}</p>
        )}
      </div>

      {/* Mobile title */}
      <div className="lg:hidden flex-1 min-w-0">
        <h1 className="text-ink font-semibold text-base leading-tight truncate">{title}</h1>
      </div>

      {/* ── Global Search ── */}
      <div className="flex-1 min-w-0 order-last lg:order-none w-full lg:w-auto">
        <GlobalSearch />
      </div>

      {/* ── Right Controls ── */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-ink-muted text-xs hidden xl:block">
          {format(now, "EEE, MMM d yyyy")}
        </span>

        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-lg text-ink-muted hover:text-forest hover:bg-cream-hover transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button className="relative p-2 rounded-lg text-ink-muted hover:text-forest hover:bg-cream-hover transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        <div className="h-6 w-px bg-cream-border" />

        <FabricIndicator />
      </div>
    </header>
  );
}

"use client";

import { LucideIcon, TrendingUp, TrendingDown, Minus, Maximize2 } from "lucide-react";
import clsx from "clsx";

type Variant = "default" | "warning" | "danger" | "success";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: Variant;
  loading?: boolean;
  onClick?: () => void;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  trendLabel?: string;
}

const BORDER_TOP: Record<Variant, string> = {
  default: "border-t-forest",
  warning: "border-t-amber-500",
  danger:  "border-t-red-500",
  success: "border-t-emerald-500",
};

const ICON_STYLES: Record<Variant, { bg: string; color: string }> = {
  default: { bg: "rgba(45,90,45,0.12)",  color: "#2d5a2d" },
  warning: { bg: "rgba(180,83,9,0.1)",   color: "#b45309" },
  danger:  { bg: "rgba(185,28,28,0.1)",  color: "#b91c1c" },
  success: { bg: "rgba(22,101,52,0.12)", color: "#166534" },
};

const VALUE_COLOR: Record<Variant, string> = {
  default: "#1a2e1a",
  warning: "#b45309",
  danger:  "#b91c1c",
  success: "#166534",
};

const GLOW: Record<Variant, string> = {
  default: "hover:shadow-[0_4px_20px_rgba(45,90,45,0.15)]",
  warning: "hover:shadow-[0_4px_20px_rgba(180,83,9,0.12)]",
  danger:  "hover:shadow-[0_4px_20px_rgba(185,28,28,0.12)]",
  success: "hover:shadow-[0_4px_20px_rgba(22,101,52,0.12)]",
};

const TREND_STYLES = {
  up:   { icon: TrendingUp,   color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  down: { icon: TrendingDown, color: "text-red-600 bg-red-50 border-red-200" },
  flat: { icon: Minus,        color: "text-ink-muted bg-cream-hover border-cream-border" },
};

export default function StatCard({
  label, value, subtext, icon: Icon,
  variant = "default", loading = false,
  onClick, trend, trendValue, trendLabel,
}: StatCardProps) {
  const iconStyle = ICON_STYLES[variant];
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={clsx(
        "rounded-xl border border-cream-border bg-cream-card p-5 border-t-2 transition-all duration-200",
        BORDER_TOP[variant],
        GLOW[variant],
        isClickable && "cursor-pointer hover:-translate-y-0.5 hover:bg-cream-hover/40 group",
      )}
      style={{ boxShadow: "0 2px 8px rgba(45,90,45,0.07)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200"
          style={{ background: iconStyle.bg }}
        >
          <Icon style={{ width: "1.1rem", height: "1.1rem", color: iconStyle.color }} />
        </div>
        {isClickable && (
          <Maximize2 className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-cream-hover rounded animate-pulse" />
          <div className="h-3.5 w-32 bg-cream-border rounded animate-pulse" />
          <div className="h-3 w-20 bg-cream-border rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold leading-tight tabular-nums"
            style={{ color: VALUE_COLOR[variant] }}>
            {value}
          </p>
          <p className="text-sm mt-1 font-medium text-ink-mid">{label}</p>
          <div className="flex items-center justify-between mt-1.5 gap-2">
            {subtext && <p className="text-xs text-ink-muted truncate flex-1">{subtext}</p>}
            {trend && trendValue && (
              <span className={clsx(
                "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0",
                TREND_STYLES[trend].color
              )}>
                {(() => { const T = TREND_STYLES[trend].icon; return <T className="w-2.5 h-2.5" />; })()}
                {trendValue}
              </span>
            )}
          </div>
          {trendLabel && <p className="text-[10px] text-ink-faint mt-0.5">{trendLabel}</p>}
        </>
      )}
    </div>
  );
}

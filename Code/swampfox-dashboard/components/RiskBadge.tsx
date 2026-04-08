import clsx from "clsx";

export type RiskLevel = "high" | "medium" | "low" | "unknown";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  pulse?: boolean;
}

const STYLES: Record<RiskLevel, string> = {
  high:    "bg-red-50 text-red-700 border border-red-200",
  medium:  "bg-amber-50 text-amber-700 border border-amber-200",
  low:     "bg-forest/10 text-forest border border-forest/30",
  unknown: "bg-cream-hover text-ink-mid border border-cream-border",
};

const DOT_STYLES: Record<RiskLevel, string> = {
  high:    "bg-red-500",
  medium:  "bg-amber-500",
  low:     "bg-forest",
  unknown: "bg-ink-faint",
};

const LABELS: Record<RiskLevel, string> = {
  high:    "High Risk",
  medium:  "Med Risk",
  low:     "Low Risk",
  unknown: "Unknown",
};

export default function RiskBadge({ level, className, pulse }: RiskBadgeProps) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      STYLES[level], className
    )}>
      <span className={clsx(
        "w-1.5 h-1.5 rounded-full",
        DOT_STYLES[level],
        pulse && level === "high" && "animate-pulse"
      )} />
      {LABELS[level]}
    </span>
  );
}

import clsx from "clsx";

interface Props {
  score: number;
  lossRatio: number;
  saferRating: string;
  highRiskDrivers: number;
  totalDrivers: number;
  openClaims: number;
  daysToRenewal: number;
}

function ScoreArc({ score }: { score: number }) {
  // SVG semi-circle gauge
  const r = 52;
  const cx = 70;
  const cy = 70;
  const startAngle = 180;
  const endAngle = 0;
  const scoreAngle = startAngle - (score / 100) * 180;

  const polarToCart = (angle: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });

  const start = polarToCart(startAngle);
  const end = polarToCart(endAngle);
  const fill = polarToCart(scoreAngle);
  const large = score >= 50 ? 0 : 1;

  const trackColor = "#1e293b";
  const arcColor =
    score >= 80 ? "#22c55e" : score >= 55 ? "#eab308" : score >= 30 ? "#f97316" : "#ef4444";

  return (
    <svg viewBox="0 0 140 80" className="w-full max-w-[160px]">
      {/* Track */}
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
        fill="none"
        stroke={trackColor}
        strokeWidth={12}
        strokeLinecap="round"
      />
      {/* Score arc */}
      {score > 0 && (
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${fill.x} ${fill.y}`}
          fill="none"
          stroke={arcColor}
          strokeWidth={12}
          strokeLinecap="round"
        />
      )}
      {/* Score text */}
      <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize={22} fontWeight={800}>
        {score}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill="#64748b" fontSize={9}>
        /100
      </text>
      {/* Labels */}
      <text x={18} y={78} textAnchor="middle" fill="#64748b" fontSize={8}>0</text>
      <text x={122} y={78} textAnchor="middle" fill="#64748b" fontSize={8}>100</text>
    </svg>
  );
}

export default function RenewalScoreCard({
  score,
  lossRatio,
  saferRating,
  highRiskDrivers,
  totalDrivers,
  openClaims,
  daysToRenewal,
}: Props) {
  const label =
    score >= 80 ? "Strong Renewal" :
    score >= 55 ? "Renew with Review" :
    score >= 30 ? "Renew with Conditions" :
    "High Risk — Do Not Renew";

  const labelColor =
    score >= 80 ? "text-green-400" :
    score >= 55 ? "text-yellow-400" :
    score >= 30 ? "text-orange-400" :
    "text-red-400";

  const labelBg =
    score >= 80 ? "bg-green-900/30 border-green-700/40" :
    score >= 55 ? "bg-yellow-900/30 border-yellow-700/40" :
    score >= 30 ? "bg-orange-900/30 border-orange-700/40" :
    "bg-red-900/30 border-red-700/40";

  const factors = [
    {
      label: "Loss Ratio",
      value: `${lossRatio}%`,
      ok: lossRatio < 70,
      warn: lossRatio >= 70 && lossRatio < 100,
    },
    {
      label: "SAFER Rating",
      value: saferRating,
      ok: saferRating === "Satisfactory",
      warn: saferRating === "Not Rated",
    },
    {
      label: "High-Risk Drivers",
      value: `${highRiskDrivers} / ${totalDrivers}`,
      ok: highRiskDrivers === 0,
      warn: highRiskDrivers > 0 && highRiskDrivers / totalDrivers < 0.3,
    },
    {
      label: "Open Claims",
      value: String(openClaims),
      ok: openClaims === 0,
      warn: openClaims <= 2,
    },
    {
      label: "Days to Renewal",
      value: `${daysToRenewal}d`,
      ok: daysToRenewal > 30,
      warn: daysToRenewal > 7 && daysToRenewal <= 30,
    },
  ];

  return (
    <div className={`card-padded border ${labelBg} space-y-4`}>
      <div className="flex items-center gap-4">
        <div className="w-40 shrink-0">
          <ScoreArc score={score} />
        </div>
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
            Renewal Readiness
          </p>
          <p className={`text-lg font-bold ${labelColor}`}>{label}</p>
          <p className="text-slate-500 text-xs mt-1">
            Composite score based on loss ratio, SAFER rating, driver risk, and claim activity
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {factors.map(({ label, value, ok, warn }) => (
          <div key={label} className="bg-slate-800/60 rounded-lg p-2.5">
            <p className="text-slate-500 text-xs mb-1">{label}</p>
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  ok ? "bg-green-500" : warn ? "bg-amber-500" : "bg-red-500"
                )}
              />
              <span
                className={clsx(
                  "text-sm font-semibold",
                  ok ? "text-green-400" : warn ? "text-amber-400" : "text-red-400"
                )}
              >
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

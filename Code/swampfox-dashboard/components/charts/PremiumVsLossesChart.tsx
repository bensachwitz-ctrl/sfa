"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { PremiumVsLossesPoint } from "@/lib/mockData";

interface Props {
  data: PremiumVsLossesPoint[];
}

interface EnrichedPoint extends PremiumVsLossesPoint {
  lossRatio: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-200 font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-slate-100 font-medium">
            {p.name === "Loss Ratio" ? `${p.value}%` : `$${p.value.toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function PremiumVsLossesChart({ data }: Props) {
  const enriched: EnrichedPoint[] = data.map((d) => ({
    ...d,
    lossRatio:
      d.writtenPremium > 0
        ? Math.round((d.incurredLosses / d.writtenPremium) * 100)
        : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={enriched} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="dollars"
          orientation="left"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={36}
          domain={[0, "auto"]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8", paddingTop: "8px" }} />
        <ReferenceLine
          yAxisId="pct"
          y={100}
          stroke="#ef4444"
          strokeDasharray="4 2"
          strokeWidth={1.5}
          label={{ value: "Breakeven", fill: "#ef4444", fontSize: 10, position: "right" }}
        />
        <Bar
          yAxisId="dollars"
          dataKey="writtenPremium"
          name="Written Premium"
          fill="#14b8a6"
          opacity={0.85}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
        <Bar
          yAxisId="dollars"
          dataKey="incurredLosses"
          name="Incurred Losses"
          fill="#f97316"
          opacity={0.8}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="lossRatio"
          name="Loss Ratio"
          stroke="#a78bfa"
          strokeWidth={2.5}
          dot={{ r: 5, fill: "#a78bfa", strokeWidth: 0 }}
          activeDot={{ r: 7 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

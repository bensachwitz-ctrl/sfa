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
  Cell,
} from "recharts";
import type { LossRatioPoint } from "@/lib/mockData";

interface Props {
  data: LossRatioPoint[];
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
            {p.name === "Loss Ratio (%)" ? `${p.value}%` : `$${p.value.toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
};

function barColor(lossRatio: number): string {
  if (lossRatio > 100) return "#ef4444";
  if (lossRatio > 75) return "#f97316";
  if (lossRatio > 50) return "#eab308";
  return "#22c55e";
}

export default function LossRatioChart({ data }: Props) {
  const shortLabel = (val: string) =>
    val.replace("Commercial ", "").replace(" Liability", " Liab.").replace("Physical Damage", "Phys. Dmg").slice(0, 14);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="coverage"
          tickFormatter={shortLabel}
          tick={{ fill: "#64748b", fontSize: 10 }}
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
          width={48}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8", paddingTop: "8px" }} />
        <ReferenceLine
          yAxisId="pct"
          y={100}
          stroke="#ef4444"
          strokeDasharray="4 2"
          strokeWidth={1.5}
          label={{ value: "100%", fill: "#ef4444", fontSize: 10, position: "right" }}
        />
        <ReferenceLine
          yAxisId="pct"
          y={70}
          stroke="#eab308"
          strokeDasharray="4 2"
          strokeWidth={1}
          label={{ value: "70%", fill: "#eab308", fontSize: 10, position: "right" }}
        />
        <Bar yAxisId="dollars" dataKey="premium" name="Premium ($)" fill="#334155" opacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => <Cell key={i} fill="#334155" />)}
        </Bar>
        <Bar yAxisId="dollars" dataKey="paidLosses" name="Paid Losses ($)" radius={[3, 3, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.lossRatio)} />
          ))}
        </Bar>
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="lossRatio"
          name="Loss Ratio (%)"
          stroke="#a78bfa"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

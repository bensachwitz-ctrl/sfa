"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ClaimsTrendPoint } from "@/lib/mockData";

interface Props {
  data: ClaimsTrendPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-slate-100 font-medium">
            {p.name === "Claims" ? p.value : `$${p.value.toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ClaimsTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="count"
          orientation="left"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <YAxis
          yAxisId="amount"
          orientation="right"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "11px", color: "#94a3b8", paddingTop: "8px" }}
        />
        <Bar
          yAxisId="amount"
          dataKey="paidAmount"
          name="Paid ($)"
          fill="#0d9488"
          opacity={0.8}
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          yAxisId="amount"
          dataKey="reservedAmount"
          name="Reserved ($)"
          fill="#f97316"
          opacity={0.7}
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="claimCount"
          name="Claims"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

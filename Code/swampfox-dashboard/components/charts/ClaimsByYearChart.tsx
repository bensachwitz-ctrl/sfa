"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataPoint { year: number; count: number; incurred: number; paid: number; reserved: number; }

function fmtDollar(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function ClaimsByYearChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-ink-muted text-sm">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d8e8c4" vertical={false} />
        <XAxis dataKey="year"   tick={{ fill: "#7a8e7a", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="count"  tick={{ fill: "#7a8e7a", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <YAxis yAxisId="money" orientation="right" tick={{ fill: "#7a8e7a", fontSize: 11 }} tickFormatter={fmtDollar} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          contentStyle={{ background: "#fdfaf4", border: "1px solid #d8e8c4", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#1a2e1a", fontWeight: 600, marginBottom: 4 }}
          formatter={(value: number, name: string) => name === "Claims" ? [value, name] : [fmtDollar(value), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#7a8e7a", paddingTop: 8 }} />
        <Bar yAxisId="count" dataKey="count" name="Claims" fill="#2d5a2d" radius={[3, 3, 0, 0]} maxBarSize={48} opacity={0.85} />
        <Line yAxisId="money" dataKey="incurred" name="Total Incurred" stroke="#c2410c" strokeWidth={2}
          dot={{ fill: "#c2410c", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface DataPoint { year: string; incurred: number; paid: number; reserved: number; claims: number; }

function fmtDollar(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export default function PortfolioIncurredChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-ink-muted text-sm">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2d5a2d" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2d5a2d" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradReserved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#b45309" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#b45309" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#d8e8c4" vertical={false} />
        <XAxis dataKey="year"    tick={{ fill: "#7a8e7a", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="money"   tick={{ fill: "#7a8e7a", fontSize: 11 }} tickFormatter={fmtDollar} axisLine={false} tickLine={false} width={56} />
        <YAxis yAxisId="count" orientation="right" tick={{ fill: "#7a8e7a", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ background: "#fdfaf4", border: "1px solid #d8e8c4", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#1a2e1a", fontWeight: 600, marginBottom: 4 }}
          formatter={(value: number, name: string) => name === "Claims" ? [value, name] : [fmtDollar(value), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#7a8e7a", paddingTop: 8 }} />
        <Area yAxisId="money" type="monotone" dataKey="paid"     name="Paid"     stroke="#2d5a2d" strokeWidth={2} fill="url(#gradPaid)" />
        <Area yAxisId="money" type="monotone" dataKey="reserved" name="Reserved" stroke="#b45309" strokeWidth={2} fill="url(#gradReserved)" />
        <Line yAxisId="count" type="monotone" dataKey="claims"   name="Claims"
          stroke="#4a5e4a" strokeWidth={1.5} strokeDasharray="4 2"
          dot={{ fill: "#4a5e4a", r: 2, strokeWidth: 0 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

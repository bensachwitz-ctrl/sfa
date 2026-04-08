"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DataPoint { category: string; count: number; incurred: number; }

const COLORS = [
  "#2d5a2d", "#4d7c3f", "#8ab87a",  // forest greens
  "#7c3aed", "#c2410c", "#b45309",  // violet, orange, amber
  "#0369a1", "#be185d", "#047857", "#6d28d9",
];

function fmtDollar(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export default function ClaimsByCategoryChart({ data, mode = "incurred" }: { data: DataPoint[]; mode?: "count" | "incurred" }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-ink-muted text-sm">No data</div>;
  }

  const sorted = [...data]
    .sort((a, b) => mode === "incurred" ? b.incurred - a.incurred : b.count - a.count)
    .slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={sorted} margin={{ top: 0, right: 40, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d8e8c4" horizontal={false} />
        <XAxis type="number"   tick={{ fill: "#7a8e7a", fontSize: 10 }} axisLine={false} tickLine={false}
          tickFormatter={mode === "incurred" ? fmtDollar : undefined} />
        <YAxis type="category" dataKey="category" tick={{ fill: "#4a5e4a", fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
        <Tooltip
          contentStyle={{ background: "#fdfaf4", border: "1px solid #d8e8c4", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#1a2e1a", fontWeight: 600 }}
          formatter={(value: number) => [mode === "incurred" ? fmtDollar(value) : value, mode === "incurred" ? "Total Incurred" : "Claims"]}
        />
        <Bar dataKey={mode === "incurred" ? "incurred" : "count"} radius={[0, 3, 3, 0]} maxBarSize={20}>
          {sorted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

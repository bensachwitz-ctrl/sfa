"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataPoint { line: string; count: number; incurred: number; }

const LINE_COLORS: Record<string, string> = {
  AL:  "#2d5a2d",   // forest green
  GL:  "#7c3aed",   // violet
  APD: "#c2410c",   // orange
};

const LINE_LABELS: Record<string, string> = {
  AL: "Auto Liability",
  GL: "General Liability",
  APD: "Auto Physical Damage",
};

function fmtDollar(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function LineOfBusinessChart({ data, mode = "incurred" }: { data: DataPoint[]; mode?: "count" | "incurred" }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-ink-muted text-sm">No data</div>;
  }

  const chartData = data.map((d) => ({
    name: LINE_LABELS[d.line] ?? d.line,
    value: mode === "incurred" ? d.incurred : d.count,
    line: d.line, count: d.count, incurred: d.incurred,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} cx="50%" cy="45%" innerRadius="35%" outerRadius="65%"
          dataKey="value" labelLine={false} label={CustomLabel}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={LINE_COLORS[entry.line] ?? "#8ab87a"} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#fdfaf4", border: "1px solid #d8e8c4", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, _name: string, item) => [
            mode === "incurred" ? fmtDollar(value) : `${value} claims`,
            item.payload.name,
          ]}
        />
        <Legend formatter={(value) => <span style={{ color: "#7a8e7a", fontSize: 11 }}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

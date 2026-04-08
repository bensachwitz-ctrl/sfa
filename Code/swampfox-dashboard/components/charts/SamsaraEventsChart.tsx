"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SamsaraEventPoint } from "@/lib/mockData";

interface Props {
  data: SamsaraEventPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + p.value, 0);
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-2">Week of {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-slate-100 font-medium">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-slate-700 mt-2 pt-1.5 flex justify-between">
        <span className="text-slate-500">Total events</span>
        <span className="text-slate-200 font-semibold">{total}</span>
      </div>
    </div>
  );
};

export default function SamsaraEventsChart({ data }: Props) {
  // Show every other week label to avoid crowding
  const tickFormatter = (_: string, index: number) =>
    index % 2 === 0 ? data[index]?.week ?? "" : "";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSpeed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradBrake" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradAccel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradCorner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={tickFormatter}
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={24}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8", paddingTop: "8px" }} />
        <Area type="monotone" dataKey="speeding" name="Speeding" stroke="#ef4444" strokeWidth={2} fill="url(#gradSpeed)" />
        <Area type="monotone" dataKey="hardBraking" name="Hard Braking" stroke="#f97316" strokeWidth={2} fill="url(#gradBrake)" />
        <Area type="monotone" dataKey="harshAcceleration" name="Harsh Accel." stroke="#a78bfa" strokeWidth={2} fill="url(#gradAccel)" />
        <Area type="monotone" dataKey="harshCornering" name="Harsh Corner." stroke="#60a5fa" strokeWidth={1.5} fill="url(#gradCorner)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

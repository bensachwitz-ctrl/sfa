"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Driver } from "@/lib/mockData";

interface Props {
  drivers: Driver[];
}

const RADIAN = Math.PI / 180;

const CustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, value, name,
}: any) => {
  if (value === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>
      {value}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-200 font-semibold">{name}</p>
      <p className="text-slate-400 mt-0.5">{value} driver{value !== 1 ? "s" : ""}</p>
    </div>
  );
};

export default function DriverRiskChart({ drivers }: Props) {
  const high = drivers.filter((d) => d.riskLevel === "high").length;
  const medium = drivers.filter((d) => d.riskLevel === "medium").length;
  const low = drivers.filter((d) => d.riskLevel === "low").length;

  const pieData = [
    { name: "High Risk", value: high, color: "#ef4444" },
    { name: "Med Risk", value: medium, color: "#f97316" },
    { name: "Low Risk", value: low, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  if (drivers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 text-sm">No driver data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="78%"
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={CustomLabel}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
          formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
        />
        {/* Center label */}
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fill="#f8fafc" fontSize={20} fontWeight={800}>
          {drivers.length}
        </text>
        <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize={11}>
          drivers
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}

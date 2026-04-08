import { NextResponse } from "next/server";
import { queryFabric } from "@/lib/fabricClient";
import { SQL } from "@/lib/fabricDb";
import { getMasterPortfolioCharts } from "@/lib/masterData";

export async function GET() {
  // ── Try Fabric aggregated queries ──────────────────────────────────────────
  const [byYear, byCategory, byCarrier] = await Promise.all([
    queryFabric<{ year: string; claims: number; paid: number; reserved: number; incurred: number }>(SQL.incurredByYear),
    queryFabric<{ category: string; count: number; incurred: number }>(SQL.claimsByCategory),
    queryFabric<{ carrier: string; count: number; incurred: number }>(SQL.claimsByCarrier),
  ]);

  if (byYear && byCategory && byCarrier) {
    return NextResponse.json({
      incurredByYear: byYear,
      claimsByCategory: byCategory.slice(0, 10),
      claimsByCarrier: byCarrier,
      // line-of-business breakdown not in bronze_claims — return empty for now
      claimsByLine: [],
      topByIncurred: [],
      _source: "fabric",
    });
  }

  // ── Local fallback ─────────────────────────────────────────────────────────
  return NextResponse.json({ ...getMasterPortfolioCharts(), _source: "local" });
}

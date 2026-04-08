import { NextResponse } from "next/server";
import { queryFabric } from "@/lib/fabricClient";
import { SQL } from "@/lib/fabricDb";
import { getMasterPortfolioKPIs } from "@/lib/masterData";

export async function GET() {
  // ── Fabric path ────────────────────────────────────────────────────────────
  const rows = await queryFabric<{
    totalClaims: number;
    openClaims: number;
    closedClaims: number;
    totalPaid: number;
    totalReserved: number;
    totalIncurred: number;
    totalCompanies: number;
  }>(SQL.portfolioKPIs);

  if (rows && rows.length > 0) {
    const r = rows[0];
    return NextResponse.json({
      ...r,
      // Derive computed fields not in the SQL aggregate
      companiesWithOpenClaims: r.totalCompanies, // placeholder — full calc needs subquery
      avgClaimsPerCompany: r.totalCompanies > 0
        ? Math.round(r.totalClaims / r.totalCompanies)
        : 0,
      avgIncurredPerClaim: r.totalClaims > 0
        ? Math.round(r.totalIncurred / r.totalClaims)
        : 0,
      _source: "fabric",
    });
  }

  // ── Local data fallback ────────────────────────────────────────────────────
  return NextResponse.json({ ...getMasterPortfolioKPIs(), _source: "local" });
}

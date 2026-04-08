import { NextResponse } from "next/server";
import { queryFabric } from "@/lib/fabricClient";
import { getMasterCompanies, type CompanySummary } from "@/lib/masterData";

// Derive company summaries by aggregating bronze_claims in Fabric
const COMPANIES_SQL = `
  SELECT
    Insured                                          AS name,
    COUNT(*)                                         AS totalClaims,
    SUM(CASE WHEN LOWER(Status)='open' THEN 1 ELSE 0 END) AS openClaims,
    SUM(CASE WHEN LOWER(Status)<>'open' THEN 1 ELSE 0 END) AS closedClaims,
    ISNULL(SUM(CAST(Paid    AS FLOAT) + CAST(Reserve AS FLOAT)), 0) AS totalIncurred,
    ISNULL(SUM(CAST(Paid    AS FLOAT)), 0)           AS totalPaid,
    ISNULL(SUM(CAST(Reserve AS FLOAT)), 0)           AS totalReserved,
    MIN(CONVERT(VARCHAR(10), DateOfLoss, 23))        AS firstLossDate,
    MAX(CONVERT(VARCHAR(10), DateOfLoss, 23))        AS lastLossDate
  FROM dbo.${process.env.FABRIC_TABLE_CLAIMS ?? "bronze_claims"}
  WHERE Insured IS NOT NULL AND Insured <> ''
  GROUP BY Insured
  ORDER BY totalIncurred DESC
`;

interface FabricCompanyRow {
  name: string;
  totalClaims: number;
  openClaims: number;
  closedClaims: number;
  totalIncurred: number;
  totalPaid: number;
  totalReserved: number;
  firstLossDate: string;
  lastLossDate: string;
}

function fabricRowToCompanySummary(r: FabricCompanyRow, idx: number): CompanySummary {
  const open = Number(r.openClaims) || 0;
  const incurred = Number(r.totalIncurred) || 0;
  // Simple risk score: open claims + log of incurred
  let risk = Math.min(open * 8, 40);
  if (incurred > 0) risk += Math.min(Math.log10(incurred + 1) * 5, 35);
  return {
    id: r.name,
    name: r.name,
    dot: "",
    address: "",
    saferRating: "Unknown",
    operatingStatus: "Unknown",
    vehicleInspections: 0,
    vehicleOOSRate: null,
    driverInspections: 0,
    driverOOSRate: null,
    totalClaims: Number(r.totalClaims) || 0,
    openClaims: open,
    closedClaims: Number(r.closedClaims) || 0,
    totalIncurred: incurred,
    totalPaid: Number(r.totalPaid) || 0,
    totalReserved: Number(r.totalReserved) || 0,
    topCategory: "",
    topLine: "AL",
    carriers: [],
    states: [],
    firstLossDate: r.firstLossDate ?? "",
    lastLossDate: r.lastLossDate ?? "",
    riskScore: Math.round(Math.min(risk, 100)),
  };
}

export async function GET() {
  // ── Fabric path ────────────────────────────────────────────────────────────
  const rows = await queryFabric<FabricCompanyRow>(COMPANIES_SQL);
  if (rows) {
    return NextResponse.json(rows.map(fabricRowToCompanySummary));
  }

  // ── Local fallback ─────────────────────────────────────────────────────────
  return NextResponse.json(getMasterCompanies());
}

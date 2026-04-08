import { NextRequest, NextResponse } from "next/server";
import { queryFabric } from "@/lib/fabricClient";
import { SQL } from "@/lib/fabricDb";
import { getMasterCompanyByName, type CompanyDetail } from "@/lib/masterData";

function buildLocalResponse(detail: CompanyDetail | null, id: string) {
  if (!detail) {
    return NextResponse.json({ error: `Company not found: ${id}` }, { status: 404 });
  }
  return NextResponse.json({
    company: {
      id: detail.id,
      accountName: detail.name,
      accountCode: detail.id,
      dotNumber: detail.dot || null,
      address: detail.address,
      saferRating: detail.saferRating,
      operatingStatus: detail.operatingStatus,
      vehicleInspections: detail.vehicleInspections,
      vehicleOOSRate: detail.vehicleOOSRate,
      driverInspections: detail.driverInspections,
      driverOOSRate: detail.driverOOSRate,
      openClaims: detail.openClaims,
      totalIncurred: detail.totalIncurred,
      totalPaid: detail.totalPaid,
      totalReserved: detail.totalReserved,
      totalClaims: detail.totalClaims,
      topCategory: detail.topCategory,
      topLine: detail.topLine,
      carriers: detail.carriers,
      states: detail.states,
      riskScore: detail.riskScore,
      lastLossDate: detail.lastLossDate,
      firstLossDate: detail.firstLossDate,
    },
    claims: detail.claims,
    charts: {
      claimsByYear: detail.claimsByYear,
      claimsByCategory: detail.claimsByCategory,
      claimsByLine: detail.claimsByLine,
    },
    policies: [],
    drivers: [],
    _source: "local",
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = decodeURIComponent(params.id);

  // ── Fabric path: pull claims for this company then aggregate ───────────────
  const fabricClaims = await queryFabric<{
    claimNumber: string; dateOfLoss: string; policyNumber: string;
    carrier: string; claimType: string; status: string; category: string;
    causeOfLoss: string; driver: string; state: string;
    totalPaid: number; totalReserve: number; totalIncurred: number;
  }>(SQL.claimsByInsured(id));

  if (fabricClaims) {
    const open = fabricClaims.filter((c) => c.status?.toLowerCase() === "open").length;
    const totalIncurred  = fabricClaims.reduce((s, c) => s + (Number(c.totalIncurred) || 0), 0);
    const totalPaid      = fabricClaims.reduce((s, c) => s + (Number(c.totalPaid)     || 0), 0);
    const totalReserved  = fabricClaims.reduce((s, c) => s + (Number(c.totalReserve)  || 0), 0);

    // Aggregate by year
    const yearMap = new Map<number, { count: number; incurred: number; paid: number; reserved: number }>();
    const catMap  = new Map<string, { count: number; incurred: number }>();
    for (const c of fabricClaims) {
      const yr = c.dateOfLoss ? new Date(c.dateOfLoss).getFullYear() : 0;
      if (yr > 2000) {
        const y = yearMap.get(yr) ?? { count: 0, incurred: 0, paid: 0, reserved: 0 };
        y.count++; y.incurred += Number(c.totalIncurred)||0;
        y.paid += Number(c.totalPaid)||0; y.reserved += Number(c.totalReserve)||0;
        yearMap.set(yr, y);
      }
      const cat = catMap.get(c.category ?? "Other") ?? { count: 0, incurred: 0 };
      cat.count++; cat.incurred += Number(c.totalIncurred)||0;
      catMap.set(c.category ?? "Other", cat);
    }

    let riskScore = Math.min(open * 8, 40);
    if (totalIncurred > 0) riskScore += Math.min(Math.log10(totalIncurred + 1) * 5, 35);

    return NextResponse.json({
      company: {
        id, accountName: id, accountCode: id,
        openClaims: open, totalClaims: fabricClaims.length,
        totalIncurred, totalPaid, totalReserved,
        riskScore: Math.round(Math.min(riskScore, 100)),
        topCategory: [...catMap.entries()].sort((a,b)=>b[1].count-a[1].count)[0]?.[0] ?? "—",
        topLine: "AL",
        carriers: [...new Set(fabricClaims.map(c=>c.carrier).filter(Boolean))],
        states:   [...new Set(fabricClaims.map(c=>c.state).filter(Boolean))],
        dotNumber: null, address: "", saferRating: "Unknown",
        operatingStatus: "Unknown", vehicleInspections: 0,
        vehicleOOSRate: null, driverInspections: 0, driverOOSRate: null,
        lastLossDate: fabricClaims[0]?.dateOfLoss ?? "",
        firstLossDate: fabricClaims[fabricClaims.length-1]?.dateOfLoss ?? "",
      },
      claims: fabricClaims,
      charts: {
        claimsByYear: Array.from(yearMap.entries()).map(([year, v]) => ({ year, ...v })).sort((a,b)=>a.year-b.year),
        claimsByCategory: Array.from(catMap.entries()).map(([category, v]) => ({ category, ...v })).sort((a,b)=>b.incurred-a.incurred),
        claimsByLine: [],
      },
      policies: [],
      drivers: [],
      _source: "fabric",
    });
  }

  // ── Local fallback ─────────────────────────────────────────────────────────
  return buildLocalResponse(getMasterCompanyByName(id), id);
}

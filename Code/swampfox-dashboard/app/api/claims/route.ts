import { NextRequest, NextResponse } from "next/server";
import { queryFabric } from "@/lib/fabricClient";
import { SQL } from "@/lib/fabricDb";
import { getMasterClaims, type MasterClaim } from "@/lib/masterData";

// Fabric row shape from SQL.allClaims
interface FabricClaimRow {
  claimNumber: string;
  dateOfLoss: string;
  policyYear: number;
  policyNumber: string;
  inception: string;
  expiration: string;
  closeDate: string;
  insured: string;
  carrier: string;
  claimType: string;
  status: string;
  category: string;
  causeOfLoss: string;
  driver: string;
  claimant: string;
  state: string;
  totalPaid: number;
  totalReserve: number;
  totalIncurred: number;
}

function fabricRowToMasterClaim(r: FabricClaimRow): MasterClaim {
  return {
    carrier: r.carrier ?? "",
    insured: r.insured ?? "",
    policyNumber: r.policyNumber ?? "",
    policyYear: Number(r.policyYear) || 0,
    claimNumber: r.claimNumber ?? "",
    dateOfLoss: r.dateOfLoss ?? "",
    inception: r.inception ?? "",
    expiration: r.expiration ?? "",
    status: (r.status ?? "").toLowerCase() === "open" ? "Open" : "Closed",
    claimType: r.claimType ?? "",
    line: "AL", // bronze_claims doesn't have a Line column — default AL
    causeOfLoss: r.causeOfLoss ?? "",
    category: r.category ?? "Other",
    totalPaid: Number(r.totalPaid) || 0,
    totalReserve: Number(r.totalReserve) || 0,
    totalIncurred: Number(r.totalIncurred) || 0,
    recovery: 0,
    deductible: 0,
    accidentDesc: "",
    driver: r.driver ?? "",
    claimant: r.claimant ?? "",
    state: r.state ?? "",
    closeDate: r.closeDate ?? "",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q        = searchParams.get("q")?.toLowerCase() ?? "";
  const status   = searchParams.get("status")   ?? "All";
  const line     = searchParams.get("line")     ?? "All";
  const carrier  = searchParams.get("carrier")  ?? "All";
  const category = searchParams.get("category") ?? "All";
  const state    = searchParams.get("state")    ?? "All";
  const company  = searchParams.get("company")  ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 50;

  // ── Fetch claims (Fabric or local) ─────────────────────────────────────────
  let claims: MasterClaim[];
  let dataSource = "local";

  const fabricRows = await queryFabric<FabricClaimRow>(SQL.allClaims);
  if (fabricRows) {
    claims = fabricRows.map(fabricRowToMasterClaim);
    dataSource = "fabric";
  } else {
    claims = getMasterClaims();
  }

  // ── Apply filters ──────────────────────────────────────────────────────────
  if (company) {
    const codes = company.split(",").map((c) => c.trim());
    claims = claims.filter((c) => codes.includes(c.insured));
  }
  if (status !== "All")   claims = claims.filter((c) => c.status === status);
  if (line !== "All")     claims = claims.filter((c) => c.line === line);
  if (carrier !== "All")  claims = claims.filter((c) => c.carrier === carrier);
  if (category !== "All") claims = claims.filter((c) => c.category === category);
  if (state !== "All")    claims = claims.filter((c) => c.state === state);
  if (q) {
    claims = claims.filter(
      (c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.insured.toLowerCase().includes(q) ||
        c.policyNumber.toLowerCase().includes(q) ||
        c.driver.toLowerCase().includes(q) ||
        c.accidentDesc.toLowerCase().includes(q)
    );
  }

  // Sort: open first, then by date descending
  claims = claims.sort((a, b) => {
    if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
    return b.dateOfLoss.localeCompare(a.dateOfLoss);
  });

  const total     = claims.length;
  const totalPages = Math.ceil(total / pageSize);
  const paginated  = claims.slice((page - 1) * pageSize, page * pageSize);

  const totalIncurred = claims.reduce((s, c) => s + c.totalIncurred, 0);
  const totalPaid     = claims.reduce((s, c) => s + c.totalPaid,     0);
  const totalReserved = claims.reduce((s, c) => s + c.totalReserve,  0);
  const openCount     = claims.filter((c) => c.status === "Open").length;

  return NextResponse.json({
    claims: paginated,
    pagination: { page, pageSize, total, totalPages },
    summary: { totalIncurred, totalPaid, totalReserved, openCount, closedCount: total - openCount },
    _source: dataSource,
  });
}

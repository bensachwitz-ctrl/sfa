import { NextResponse } from "next/server";
import { getFabricStatus, queryFabric, querySamsara } from "@/lib/fabricClient";

export async function GET() {
  const status = await getFabricStatus();

  if (!status.configured) {
    return NextResponse.json({
      ...status,
      message: status.error ?? "Add FABRIC_SQL_USER + FABRIC_SQL_PASSWORD to .env.local to activate live data.",
    });
  }

  // Quick row count sanity checks (run in parallel)
  const [claimRow, samsaraRow] = await Promise.all([
    status.connected
      ? queryFabric<{ n: number }>(
          `SELECT COUNT(*) AS n FROM dbo.${process.env.FABRIC_TABLE_CLAIMS ?? "all_claims"}`
        )
      : null,
    status.samsaraConnected
      ? querySamsara<{ n: number }>(
          `SELECT COUNT(*) AS n FROM dbo.${process.env.FABRIC_TABLE_SAMSARA ?? "gold_speeding_driver_daily"}`
        )
      : null,
  ]);

  return NextResponse.json({
    ...status,
    claimCount:   claimRow?.[0]?.n   ?? null,
    samsaraCount: samsaraRow?.[0]?.n ?? null,
    message: status.connected ? "Connected" : status.error ?? "Connection failed",
  });
}

import { NextResponse } from "next/server";
import { getMasterRiskAlerts } from "@/lib/masterData";

export async function GET() {
  const alerts = getMasterRiskAlerts();
  return NextResponse.json({ alerts });
}

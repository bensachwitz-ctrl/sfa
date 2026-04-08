// This route is an OPTIONAL server-side helper for service principal embed
// (embed for your customers). For internal "embed for your organization" use
// (the recommended approach for agency staff), the PowerBIReport component
// acquires tokens client-side via MSAL — this route is not required.
//
// If you later need service principal embedding (e.g., for external portal),
// add the following to .env.local:
//   AZURE_SP_TENANT_ID, AZURE_SP_CLIENT_ID, AZURE_SP_CLIENT_SECRET

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { reportId, workspaceId } = await req.json();

  if (!reportId || !workspaceId) {
    return NextResponse.json(
      { error: "reportId and workspaceId are required" },
      { status: 400 }
    );
  }

  const tenantId = process.env.AZURE_SP_TENANT_ID;
  const clientId = process.env.AZURE_SP_CLIENT_ID;
  const clientSecret = process.env.AZURE_SP_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Service principal credentials not configured. See .env.local.example.",
      },
      { status: 503 }
    );
  }

  try {
    // 1. Get AAD token for service principal
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://analysis.windows.net/powerbi/api/.default",
        }),
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[PBI Token] AAD error:", err);
      return NextResponse.json(
        { error: "Failed to acquire AAD token." },
        { status: 502 }
      );
    }

    const { access_token: aadToken } = await tokenRes.json();

    // 2. Get Power BI embed token
    const embedRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aadToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessLevel: "View" }),
      }
    );

    if (!embedRes.ok) {
      const err = await embedRes.text();
      console.error("[PBI Token] Embed token error:", err);
      return NextResponse.json(
        { error: "Failed to generate embed token." },
        { status: 502 }
      );
    }

    const { token, expiration } = await embedRes.json();

    return NextResponse.json(
      { token, expiration },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    console.error("[PBI Token] Unexpected error:", err?.message);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

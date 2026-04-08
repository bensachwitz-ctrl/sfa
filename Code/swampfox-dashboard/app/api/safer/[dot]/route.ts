import { NextRequest, NextResponse } from "next/server";
import { fetchCarrierByDot } from "@/lib/saferApi";

export async function GET(
  _req: NextRequest,
  { params }: { params: { dot: string } }
) {
  const dot = params.dot?.trim().replace(/\D/g, "");

  if (!dot || dot.length < 3 || dot.length > 10) {
    return NextResponse.json(
      { error: "Invalid DOT number format." },
      { status: 400 }
    );
  }

  if (!process.env.FMCSA_API_KEY) {
    return NextResponse.json(
      {
        error:
          "FMCSA_API_KEY is not configured. Add it to .env.local and restart the server.",
      },
      { status: 503 }
    );
  }

  try {
    const carrier = await fetchCarrierByDot(dot);

    if (!carrier) {
      return NextResponse.json(
        { error: "Carrier not found for this DOT number." },
        { status: 404 }
      );
    }

    return NextResponse.json(carrier, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (err: any) {
    console.error("[SAFER API] Error:", err?.message);
    return NextResponse.json(
      { error: err?.message || "FMCSA lookup failed." },
      { status: 502 }
    );
  }
}

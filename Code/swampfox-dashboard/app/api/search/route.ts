import { NextRequest, NextResponse } from "next/server";
import { searchMaster } from "@/lib/masterData";
import type { SearchResultItem, SearchResults } from "@/services/dataService";

const MAX = 6;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json<SearchResults>({ companies: [], policies: [], claims: [] });
  }

  const { companies, claims } = searchMaster(q);

  const companyResults: SearchResultItem[] = companies.slice(0, MAX).map((c) => ({
    type: "company",
    id: c.id,
    label: c.name,
    sublabel: [c.dot ? `DOT ${c.dot}` : null, c.states.join("/") || null]
      .filter(Boolean)
      .join(" · "),
    accountCode: c.id,
    accountName: c.name,
    dotNumber: c.dot || undefined,
  }));

  const claimResults: SearchResultItem[] = claims.slice(0, MAX).map((c) => ({
    type: "claim",
    id: c.claimNumber,
    label: c.claimNumber,
    sublabel: `${c.claimType} · ${c.insured} · ${c.status}`,
    accountCode: c.insured,
    accountName: c.insured,
  }));

  return NextResponse.json<SearchResults>({
    companies: companyResults,
    policies: [],   // populated from Fabric when connected
    claims: claimResults,
  });
}

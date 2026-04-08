// FMCSA SAFER Web Services — Carrier safety data by DOT number
// API key registration: https://ai.fmcsa.dot.gov/SMS/Tools/WebServices.aspx

const FMCSA_BASE = "https://mobile.fmcsa.dot.gov/qc/services";

export interface SaferCarrier {
  dotNumber: string;
  legalName: string;
  dbaName?: string;
  carrierOperation: string;
  hmFlag: string;
  pcFlag: string;
  phyStreet: string;
  phyCity: string;
  phyState: string;
  phyZip: string;
  phyCountry: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  telephone: string;
  fax?: string;
  emailAddress?: string;
  mcsipPage?: string;
  oosDate?: string;
  operatingStatus?: string;
  entityType?: string;
  // Safety ratings
  safetyRating?: string;
  safetyRatingDate?: string;
  safetyReviewDate?: string;
  safetyReviewType?: string;
  // Crashes (24 months)
  crashTotal?: number;
  fatalCrash?: number;
  injCrash?: number;
  towawayCrash?: number;
  // Inspections (24 months)
  driverInsp?: number;
  driverOosInsp?: number;
  vehicleInsp?: number;
  vehicleOosInsp?: number;
  hazmatInsp?: number;
  hazmatOosInsp?: number;
  iepInspTotal?: number;
  iepVehicleOosTotal?: number;
  iepDriverOosTotal?: number;
}

export interface SaferApiResponse {
  content: {
    carrier: SaferCarrier;
  };
}

export async function fetchCarrierByDot(
  dotNumber: string
): Promise<SaferCarrier | null> {
  const apiKey = process.env.FMCSA_API_KEY;
  if (!apiKey) {
    throw new Error("FMCSA_API_KEY not configured in environment variables");
  }

  const url = `${FMCSA_BASE}/carriers/${dotNumber}?webKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1hr

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`FMCSA API error: ${res.status} ${res.statusText}`);
  }

  const data: SaferApiResponse = await res.json();
  return data?.content?.carrier ?? null;
}

export function getSafetyRatingColor(rating?: string): string {
  if (!rating) return "text-slate-400";
  const r = rating.toLowerCase();
  if (r === "satisfactory") return "text-green-400";
  if (r === "conditional") return "text-amber-400";
  if (r === "unsatisfactory") return "text-red-400";
  return "text-slate-400";
}

export function getSafetyRatingBg(rating?: string): string {
  if (!rating) return "bg-slate-700";
  const r = rating.toLowerCase();
  if (r === "satisfactory") return "bg-green-900/40 border-green-700/50";
  if (r === "conditional") return "bg-amber-900/40 border-amber-700/50";
  if (r === "unsatisfactory") return "bg-red-900/40 border-red-700/50";
  return "bg-slate-700 border-slate-600";
}

export function calcOosRate(oos: number, total: number): string {
  if (!total) return "0%";
  return `${((oos / total) * 100).toFixed(1)}%`;
}

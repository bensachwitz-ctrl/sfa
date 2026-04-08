export interface ReportConfig {
  reportId: string;
  groupId: string;
  reportName: string;
  description?: string;
}

export const WORKSPACE_ID =
  process.env.NEXT_PUBLIC_PBI_WORKSPACE_ID || "";

export const REPORTS: Record<string, ReportConfig> = {
  overview: {
    reportId: process.env.NEXT_PUBLIC_PBI_OVERVIEW_REPORT_ID || "",
    groupId: WORKSPACE_ID,
    reportName: "Agency Overview",
    description: "High-level KPIs across all lines",
  },
  claims: {
    reportId: process.env.NEXT_PUBLIC_PBI_CLAIMS_REPORT_ID || "",
    groupId: WORKSPACE_ID,
    reportName: "Claims Dashboard",
    description: "Open, closed, and pending claims by loss type",
  },
  policies: {
    reportId: process.env.NEXT_PUBLIC_PBI_POLICIES_REPORT_ID || "",
    groupId: WORKSPACE_ID,
    reportName: "Policies Dashboard",
    description: "Active policies, renewals, and coverage analysis",
  },
  drivers: {
    reportId: process.env.NEXT_PUBLIC_PBI_DRIVERS_REPORT_ID || "",
    groupId: WORKSPACE_ID,
    reportName: "Driver Risk & Telematics",
    description: "Driver safety scores and Samsara telematics events",
  },
  riskAlerts: {
    reportId: process.env.NEXT_PUBLIC_PBI_RISK_REPORT_ID || "",
    groupId: WORKSPACE_ID,
    reportName: "Risk Alerts",
    description: "Combined high-risk drivers and renewal risk policies",
  },
  companies: {
    reportId: process.env.NEXT_PUBLIC_PBI_COMPANIES_REPORT_ID || "",
    groupId: WORKSPACE_ID,
    reportName: "Companies & DOT Scores",
    description: "FMCSA SAFER scores and carrier safety by DOT number",
  },
};

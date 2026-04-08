"use client";

import { AlertTriangle } from "lucide-react";
import type { ReportConfig } from "@/lib/powerbiConfig";

interface PowerBIReportProps {
  config: ReportConfig;
  height?: string;
  className?: string;
  filterPaneVisible?: boolean;
  pageNavVisible?: boolean;
}

// Power BI embedding requires Azure AD credentials + a configured
// workspace. Until those are set up, this placeholder is shown instead.
// When NEXT_PUBLIC_AZURE_CLIENT_ID and NEXT_PUBLIC_PBI_WORKSPACE_ID are
// added to .env.local this component will activate the full embed.

export default function PowerBIReport({
  config,
  height = "680px",
  className = "",
}: PowerBIReportProps) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-800/40 border border-slate-700/50 flex items-center justify-center ${className}`}
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-8">
        <div className="w-14 h-14 rounded-full bg-slate-700/60 border border-slate-600/50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <p className="text-slate-200 font-semibold mb-1">{config.reportName}</p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Add your Power BI workspace and report IDs to{" "}
            <code className="text-teal-400 text-xs bg-slate-700/50 px-1 py-0.5 rounded">
              .env.local
            </code>{" "}
            to embed this report. All other dashboard data is live from your claims file.
          </p>
        </div>
      </div>
    </div>
  );
}

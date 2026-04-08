"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, FileText, Shield,
  AlertTriangle, Building2, LogOut, ChevronRight,
  RefreshCw, TrendingUp, Gauge,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/",              label: "Overview",        icon: LayoutDashboard, exact: true },
  { href: "/claims",        label: "Claims",          icon: FileText },
  { href: "/policies",      label: "Policies",        icon: Shield },
  { href: "/renewals",      label: "Renewals",        icon: RefreshCw },
  { href: "/drivers",       label: "Speed Reports",   icon: Gauge },
  { href: "/companies",     label: "Companies & DOT", icon: Building2 },
  { href: "/loss-exposure", label: "Loss Exposure",   icon: TrendingUp },
  { href: "/risk-alerts",   label: "Risk Alerts",     icon: AlertTriangle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [logoError, setLogoError] = useState(false);

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50"
      style={{ background: "linear-gradient(180deg, #071507 0%, #0a1f0a 40%, #0d2a0d 100%)" }}
    >
      {/* ── Logo / Brand ── */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(138,184,122,0.12)" }}>
        <div className="flex items-center gap-3">
          {/* Logo image — drop your logo.png into the public/ folder */}
          {!logoError ? (
            <img
              src="/logo.png"
              alt="Swamp Fox Agency"
              className="w-11 h-11 rounded-xl object-contain shrink-0"
              style={{ background: "rgba(138,184,122,0.08)", padding: "2px" }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #2d5a2d 0%, #4d7c3f 100%)" }}
            >
              <Shield className="w-5 h-5" style={{ color: "#f5f0e0" }} />
            </div>
          )}

          <div>
            <p className="font-bold text-sm leading-tight tracking-tight" style={{ color: "#f5f0e0" }}>
              Swamp Fox
            </p>
            <p className="text-[11px] font-medium" style={{ color: "#8ab87a" }}>
              Insurance Agency
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3"
          style={{ color: "rgba(138,184,122,0.4)" }}
        >
          Navigation
        </p>

        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
              )}
              style={
                active
                  ? {
                      background: "linear-gradient(90deg, rgba(45,90,45,0.6) 0%, rgba(45,90,45,0.3) 100%)",
                      color: "#f5f0e0",
                      border: "1px solid rgba(138,184,122,0.25)",
                      boxShadow: "inset 0 0 0 1px rgba(138,184,122,0.08)",
                    }
                  : {
                      color: "rgba(245,240,224,0.5)",
                      border: "1px solid transparent",
                    }
              }
            >
              <Icon
                className="w-4 h-4 shrink-0 transition-colors"
                style={{ color: active ? "#8ab87a" : "rgba(138,184,122,0.4)" }}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5" style={{ color: "#8ab87a" }} />
              )}
              {label === "Risk Alerts" && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid rgba(138,184,122,0.1)" }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2"
          style={{ background: "rgba(45,90,45,0.25)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #2d5a2d 0%, #4d7c3f 100%)", color: "#f5f0e0" }}
          >
            SF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#f5f0e0" }}>
              Agency User
            </p>
            <p className="text-[11px] truncate" style={{ color: "rgba(138,184,122,0.55)" }}>
              Swamp Fox Agency
            </p>
          </div>
        </div>

        <button
          onClick={() => { window.location.href = "/"; }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: "rgba(245,240,224,0.35)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#fca5a5";
            (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(245,240,224,0.35)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

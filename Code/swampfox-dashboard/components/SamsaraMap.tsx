"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SpeedingEvent } from "@/lib/samsaraData";
import { Filter, RefreshCw } from "lucide-react";
import clsx from "clsx";

interface Props {
  events?: SpeedingEvent[];   // if provided, used directly (no API call)
  height?: number | string;
  showFilters?: boolean;
  companies?: string[];       // dropdown options (auto-loaded from API if omitted)
  company?: string;           // pre-filter to one company (passed to API)
}

const SEVERITY_COLORS = {
  low:    { fill: "#f59e0b", stroke: "#d97706" },
  medium: { fill: "#f97316", stroke: "#ea580c" },
  high:   { fill: "#dc2626", stroke: "#b91c1c" },
};

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Dynamically load Leaflet (SSR-incompatible)
let leafletLoaded = false;

export default function SamsaraMap({
  events: eventsProp,
  height = 400,
  showFilters = true,
  companies: companiesProp,
  company: companyProp,
}: Props) {
  // ── Data state (loaded from API when no prop is given) ─────────────────────
  const [events,    setEvents]    = useState<SpeedingEvent[]>(eventsProp ?? []);
  const [companies, setCompanies] = useState<string[]>(companiesProp ?? []);
  const [loading,   setLoading]   = useState(!eventsProp);

  const mapRef         = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [ready,         setReady]         = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "low" | "medium" | "high">("all");
  const [filterCompany,  setFilterCompany]  = useState("All");
  const [selectedEvent,  setSelectedEvent]  = useState<SpeedingEvent | null>(null);

  // ── Fetch from /api/samsara when no events prop ────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (eventsProp) return; // parent controls data
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyProp) params.set("company", companyProp);

      const [eventsRes, companiesRes] = await Promise.all([
        fetch(`/api/samsara?${params}`).then((r) => r.json()),
        companiesProp ? Promise.resolve(companiesProp) :
          fetch("/api/samsara?action=companies").then((r) => r.json()),
      ]);

      if (Array.isArray(eventsRes))    setEvents(eventsRes);
      if (Array.isArray(companiesRes)) setCompanies(companiesRes);
    } catch (err) {
      console.error("[SamsaraMap] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [eventsProp, companyProp, companiesProp]);

  // Initial load + refresh when company prop changes
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // If parent passes new events directly, sync them
  useEffect(() => {
    if (eventsProp) { setEvents(eventsProp); setLoading(false); }
  }, [eventsProp]);

  // Load Leaflet CSS once
  useEffect(() => {
    if (leafletLoaded) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    leafletLoaded = true;
    setTimeout(() => setReady(true), 100);
  }, []);

  // Build/update map
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const initMap = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (await import("leaflet")) as any;

      // Destroy previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const filtered = events.filter((e) => {
        if (filterSeverity !== "all"  && e.severity    !== filterSeverity) return false;
        if (filterCompany  !== "All"  && e.company_key !== filterCompany)  return false;
        return true;
      });

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      filtered.forEach((event) => {
        const colors = SEVERITY_COLORS[event.severity];
        const circle = L.circleMarker([event.lat, event.lng], {
          radius: event.severity === "high" ? 9 : event.severity === "medium" ? 7 : 5,
          fillColor:   colors.fill,
          color:       colors.stroke,
          weight:      1.5,
          opacity:     0.9,
          fillOpacity: 0.75,
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family:Inter,sans-serif;font-size:12px;min-width:200px">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1a2e1a">${event.vehicle_name}</div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;color:#4a5e4a">
              <span style="color:#7a8e7a">Driver</span><span>${event.driver_name}</span>
              <span style="color:#7a8e7a">Company</span><span style="font-size:11px">${event.company_key}</span>
              <span style="color:#7a8e7a">Speed</span><span><b style="color:#b91c1c">${event.speed_mph} mph</b> in ${event.posted_speed_mph} zone</span>
              <span style="color:#7a8e7a">Over by</span><span style="font-weight:700;color:${colors.fill}">${event.overage_mph} mph</span>
              <span style="color:#7a8e7a">Date</span><span>${fmt(event.timestamp)}</span>
              <span style="color:#7a8e7a">State</span><span>${event.state}</span>
            </div>
          </div>
        `, { maxWidth: 260 });

        circle.on("click", () => setSelectedEvent(event));
        bounds.push([event.lat, event.lng]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 11 });
      } else {
        // Default to Southeast US
        map.setView([33.5, -80.5], 6);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ready, events, filterSeverity, filterCompany]);

  const filteredEvents = events.filter((e) => {
    if (filterSeverity !== "all"  && e.severity    !== filterSeverity) return false;
    if (filterCompany  !== "All"  && e.company_key !== filterCompany)  return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
          <Filter className="w-3.5 h-3.5 text-ink-muted shrink-0" />

          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted text-xs">Severity:</span>
            {(["all", "low", "medium", "high"] as const).map((s) => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors capitalize",
                  filterSeverity === s ? "pill-active" : "pill-inactive")}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {companies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-muted text-xs">Company:</span>
              <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
                className="form-select text-xs py-0.5 max-w-[160px]">
                <option value="All">All Companies</option>
                {companies.map((c) => <option key={c} value={c}>{c.length > 30 ? c.slice(0, 28) + "…" : c}</option>)}
              </select>
            </div>
          )}

          {/* Refresh button — reloads from API/file */}
          {!eventsProp && (
            <button onClick={fetchEvents} disabled={loading}
              className="flex items-center gap-1 text-ink-muted hover:text-forest text-xs transition-colors ml-1"
              title="Reload from data source">
              <RefreshCw className={clsx("w-3 h-3", loading && "animate-spin")} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          )}

          <span className="text-ink-faint text-xs ml-auto">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Map container */}
      <div className="relative overflow-hidden border-t border-cream-border"
        style={{ height }}>
        {(!ready || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream-card text-ink-muted text-sm z-10">
            {loading ? "Loading events…" : "Initializing map…"}
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-cream-card/95 border border-cream-border rounded-lg px-3 py-2 z-[1000] text-xs space-y-1">
          <p className="text-ink-muted font-medium mb-1.5">Severity</p>
          {[
            { label: "Low (&lt;10 mph over)",    color: "#f59e0b" },
            { label: "Medium (10–20 mph over)",  color: "#f97316" },
            { label: "High (&gt;20 mph over)",   color: "#dc2626" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-ink-mid" dangerouslySetInnerHTML={{ __html: label }} />
            </div>
          ))}
        </div>
      </div>

      {/* Selected event detail panel */}
      {selectedEvent && (
        <div className="card-padded border-l-4"
          style={{ borderLeftColor: SEVERITY_COLORS[selectedEvent.severity].fill }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-ink font-semibold text-sm">{selectedEvent.vehicle_name} — {selectedEvent.driver_name}</p>
              <p className="text-ink-muted text-xs mt-0.5">{selectedEvent.company_key} · {selectedEvent.state} · {fmt(selectedEvent.timestamp)}</p>
            </div>
            <button onClick={() => setSelectedEvent(null)}
              className="text-ink-muted hover:text-ink transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
            <div>
              <p className="text-ink-muted">Recorded Speed</p>
              <p className="text-ink font-bold text-base">{selectedEvent.speed_mph} mph</p>
            </div>
            <div>
              <p className="text-ink-muted">Posted Limit</p>
              <p className="text-ink font-bold text-base">{selectedEvent.posted_speed_mph} mph</p>
            </div>
            <div>
              <p className="text-ink-muted">Over Limit By</p>
              <p className="font-bold text-base" style={{ color: SEVERITY_COLORS[selectedEvent.severity].fill }}>
                +{selectedEvent.overage_mph} mph
              </p>
            </div>
          </div>
          <p className="text-ink-muted text-xs mt-2">
            GPS: {selectedEvent.lat.toFixed(4)}, {selectedEvent.lng.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}

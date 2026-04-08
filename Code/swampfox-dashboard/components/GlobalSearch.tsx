"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Building2, FileText } from "lucide-react";
import { searchData } from "@/lib/clientData";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery]           = useState("");
  const [open, setOpen]             = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 180);

  const results   = debouncedQuery.length >= 2 ? searchData(debouncedQuery) : null;
  const companies = results?.companies ?? [];
  const claims    = results?.claims ?? [];
  const hasResults = companies.length > 0 || claims.length > 0;

  type NavItem = { type: "company" | "claim"; id: string; label: string; sub: string };
  const flatItems: NavItem[] = [
    ...companies.map((c) => ({ type: "company" as const, id: c.id, label: c.name, sub: `DOT ${c.dot || "—"} · ${c.totalClaims} claims` })),
    ...claims.map((c)    => ({ type: "claim"   as const, id: c.insured, label: c.claimNumber, sub: `${c.insured} · ${c.line} · ${c.status}` })),
  ];

  useEffect(() => {
    if (debouncedQuery.length >= 2) { setOpen(true); setActiveIndex(-1); }
    else setOpen(false);
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(item: NavItem) {
    router.push(`/companies/${encodeURIComponent(item.id)}`);
    setQuery(""); setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); handleSelect(flatItems[activeIndex]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-ink-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (hasResults) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search company, claim #, or DOT..."
          className="w-full h-9 pl-9 pr-8 rounded-lg bg-cream border border-cream-border text-ink text-sm placeholder-ink-faint focus:outline-none focus:border-forest/50 focus:ring-1 focus:ring-forest/20 transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2.5 text-ink-muted hover:text-ink transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-cream-card border border-cream-border rounded-xl overflow-hidden z-50"
          style={{ boxShadow: "0 8px 24px rgba(45,90,45,0.15)" }}>
          {hasResults ? (
            <div className="py-1 max-h-80 overflow-y-auto">
              {companies.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Companies
                  </div>
                  {companies.map((c, i) => {
                    const active = i === activeIndex;
                    return (
                      <button key={c.id}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect({ type: "company", id: c.id, label: c.name, sub: "" }); }}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors ${active ? "bg-cream-hover" : "hover:bg-cream-hover"}`}>
                        <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-forest" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-ink truncate block">{c.name}</span>
                          <span className="text-xs text-ink-muted block">
                            {c.dot ? `DOT ${c.dot} · ` : ""}{c.totalClaims} claims · {c.openClaims > 0 ? `${c.openClaims} open` : "all closed"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {claims.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Claims
                  </div>
                  {claims.map((c, i) => {
                    const idx    = companies.length + i;
                    const active = idx === activeIndex;
                    return (
                      <button key={c.claimNumber}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect({ type: "claim", id: c.insured, label: c.claimNumber, sub: "" }); }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors ${active ? "bg-cream-hover" : "hover:bg-cream-hover"}`}>
                        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-ink-muted" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-ink font-mono block">{c.claimNumber}</span>
                          <span className="text-xs text-ink-muted block">{c.insured} · {c.line} · {c.status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-ink-muted text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          <div className="border-t border-cream-border px-3 py-1.5 text-[10px] text-ink-faint">
            Arrow keys to navigate &nbsp;&middot;&nbsp; Enter to select &nbsp;&middot;&nbsp; Esc to close
          </div>
        </div>
      )}
    </div>
  );
}

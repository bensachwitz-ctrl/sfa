"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import type { Company } from "@/lib/mockData";

interface CompanySearchContextType {
  selectedCompanies: Company[];
  addCompany: (c: Company) => void;
  removeCompany: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedAccountCodes: string[];
}

const CompanySearchContext = createContext<CompanySearchContextType | null>(null);

const SESSION_KEY = "sfx_selected_companies";

export function CompanySearchProvider({ children }: { children: ReactNode }) {
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setSelectedCompanies(JSON.parse(stored));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist whenever selection changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(selectedCompanies));
    } catch {
      // ignore
    }
  }, [selectedCompanies, hydrated]);

  const addCompany = useCallback((c: Company) => {
    setSelectedCompanies((prev) =>
      prev.some((x) => x.id === c.id) ? prev : [...prev, c]
    );
  }, []);

  const removeCompany = useCallback((id: string) => {
    setSelectedCompanies((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearSelection = useCallback(() => setSelectedCompanies([]), []);

  const isSelected = useCallback(
    (id: string) => selectedCompanies.some((c) => c.id === id),
    [selectedCompanies]
  );

  const selectedAccountCodes = selectedCompanies.map((c) => c.accountCode);

  return (
    <CompanySearchContext.Provider
      value={{
        selectedCompanies,
        addCompany,
        removeCompany,
        clearSelection,
        isSelected,
        selectedAccountCodes,
      }}
    >
      {children}
    </CompanySearchContext.Provider>
  );
}

export function useCompanySearch() {
  const ctx = useContext(CompanySearchContext);
  if (!ctx)
    throw new Error("useCompanySearch must be used within CompanySearchProvider");
  return ctx;
}

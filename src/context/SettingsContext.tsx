import { createContext, useContext, ReactNode } from "react";
import { useSettings, AppSettings } from "../hooks/useSettings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const value = useSettings();
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used inside <SettingsProvider>");
  return ctx;
}

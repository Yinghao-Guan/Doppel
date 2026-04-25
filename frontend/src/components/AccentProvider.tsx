"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ACCENT_STORAGE_KEY,
  ACCENTS,
  AccentPreset,
  DEFAULT_ACCENT_ID,
} from "@/lib/accents";

type AccentContextValue = {
  accent: AccentPreset;
  setAccentId: (id: string) => void;
};

const AccentContext = createContext<AccentContextValue>({
  accent: ACCENTS[0],
  setAccentId: () => {},
});

function applyAccent(preset: AccentPreset) {
  const root = document.documentElement;
  root.style.setProperty("--accent", preset.accent);
  root.style.setProperty("--accent-deep", preset.accentDeep);
  root.style.setProperty("--accent-cyan", preset.accentCyan);
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accentId, setAccentIdState] = useState<string>(DEFAULT_ACCENT_ID);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (saved && ACCENTS.some((a) => a.id === saved)) {
        setAccentIdState(saved);
      }
    } catch {
      /* localStorage may be blocked — silently keep default */
    }
  }, []);

  const accent = useMemo(
    () => ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0],
    [accentId],
  );

  // Apply CSS variables every time the chosen accent changes.
  useEffect(() => {
    applyAccent(accent);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent.id);
    } catch {
      /* ignore */
    }
  }, [accent]);

  const setAccentId = useCallback((id: string) => setAccentIdState(id), []);

  const value = useMemo(
    () => ({ accent, setAccentId }),
    [accent, setAccentId],
  );

  return (
    <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
  );
}

export const useAccent = () => useContext(AccentContext);

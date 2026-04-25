"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TrainingFingerprint } from "@/types/fingerprint";

interface AthleteStore {
  fingerprint: TrainingFingerprint | null;
  setFingerprint: (f: TrainingFingerprint) => void;
  clearFingerprint: () => void;
}

export const useAthleteStore = create<AthleteStore>()(
  persist(
    (set) => ({
      fingerprint: null,
      setFingerprint: (fingerprint) => set({ fingerprint }),
      clearFingerprint: () => set({ fingerprint: null }),
    }),
    { name: "doppel.fingerprint.v1" },
  ),
);

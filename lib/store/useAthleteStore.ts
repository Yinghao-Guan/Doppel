/**
 * Global state. Read-write by every component.
 * Keep this lean — only put cross-cutting state here. Local UI state stays
 * in individual components.
 */
import { create } from "zustand";
import type {
  CoachAdvice,
  Projection,
  TrainingFingerprint,
  TrainingPlan,
  UserProfile,
} from "@/types";

interface AthleteState {
  profile: UserProfile | null;
  fingerprint: TrainingFingerprint | null;
  selectedPlan: TrainingPlan | null;
  projection: Projection | null;
  advice: CoachAdvice | null;
  isCapturing: boolean;

  setProfile: (p: UserProfile) => void;
  setFingerprint: (f: TrainingFingerprint) => void;
  setSelectedPlan: (p: TrainingPlan) => void;
  setProjection: (p: Projection) => void;
  setAdvice: (a: CoachAdvice) => void;
  setCapturing: (c: boolean) => void;
  reset: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  age: 22,
  heightCm: 178,
  weightKg: 75,
  fitnessLevel: "intermediate",
  goal: "strength",
  trainingFrequency: 4,
  sleepHours: 7,
};

export const useAthleteStore = create<AthleteState>((set) => ({
  profile: DEFAULT_PROFILE,
  fingerprint: null,
  selectedPlan: null,
  projection: null,
  advice: null,
  isCapturing: false,

  setProfile: (profile) => set({ profile }),
  setFingerprint: (fingerprint) => set({ fingerprint }),
  setSelectedPlan: (selectedPlan) => set({ selectedPlan }),
  setProjection: (projection) => set({ projection }),
  setAdvice: (advice) => set({ advice }),
  setCapturing: (isCapturing) => set({ isCapturing }),
  reset: () =>
    set({
      fingerprint: null,
      selectedPlan: null,
      projection: null,
      advice: null,
      isCapturing: false,
    }),
}));

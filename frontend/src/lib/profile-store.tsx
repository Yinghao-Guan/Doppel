"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ProfileFields } from "@/types/predict";

const STORAGE_KEY = "doppel.profile.v1";

type Profile = Partial<ProfileFields>;

type Ctx = {
  profile: Profile;
  setProfile: (p: Profile) => void;
  updateProfile: (patch: Profile) => void;
  isComplete: boolean;
  hydrated: boolean;
};

const ProfileContext = createContext<Ctx | null>(null);

const REQUIRED_KEYS: (keyof ProfileFields)[] = [
  "Age",
  "Gender",
  "Height",
  "Weight",
  "Workout_Frequency",
  "Experience_Level",
  "Workout_Type",
];

function isProfileComplete(p: Profile): boolean {
  return REQUIRED_KEYS.every((k) => p[k] !== undefined && p[k] !== null);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setProfileState(JSON.parse(raw));
    } catch {
      // ignore — fresh state is fine
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((p: Profile) => {
    setProfileState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // storage might be unavailable; in-memory state still works
    }
  }, []);

  const updateProfile = useCallback(
    (patch: Profile) => {
      persist({ ...profile, ...patch });
    },
    [persist, profile],
  );

  const value = useMemo<Ctx>(
    () => ({
      profile,
      setProfile: persist,
      updateProfile,
      isComplete: isProfileComplete(profile),
      hydrated,
    }),
    [profile, persist, updateProfile, hydrated],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used inside <ProfileProvider>");
  }
  return ctx;
}

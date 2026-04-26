/**
 * Twin tab audio bookkeeping.
 *
 * Tracks which fingerprint timestamps have already triggered the
 * one-shot summary auto-play, so:
 *
 *   - Brand-new fingerprint (set just completed) → auto-play once.
 *   - Same fingerprint again (re-render, re-navigation) → silent.
 *   - Next set produces a fresh timestamp → auto-play again.
 *
 * State is in-memory only (zustand). A page reload resets it, which
 * matches user expectations: a hard refresh feels like a new session
 * and replaying the summary is fine.
 */
import { create } from "zustand";

interface TwinAudioState {
  /** Timestamp of the most recent fingerprint we have already auto-played. */
  lastAutoPlayedTimestamp: number | null;
  markAutoPlayed: (ts: number) => void;
  reset: () => void;
}

export const useTwinAudioStore = create<TwinAudioState>((set) => ({
  lastAutoPlayedTimestamp: null,
  markAutoPlayed: (ts) => set({ lastAutoPlayedTimestamp: ts }),
  reset: () => set({ lastAutoPlayedTimestamp: null }),
}));

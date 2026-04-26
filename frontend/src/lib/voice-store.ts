/**
 * Voice playback state — independent from athlete-store so the two concerns
 * stay decoupled. Used by:
 *   - voice-client (writes isPlaying, currentText)
 *   - live-coach   (reads lastCueAt + lastTriggerId for throttle/dedupe)
 *   - PoseCamera   (writes lastCueAt + lastTriggerId on each cue fire,
 *                   reads isPlaying for the status pill, mute for gating)
 *   - CoachCaption (reads currentText for the on-screen bubble)
 *   - SummaryAudioButton (reads isPlaying for play/pause icon swap)
 */
import { create } from "zustand";
import type { TriggerId } from "./live-coach";

interface VoiceState {
  /** Master switch. Off → no audio fetched or played. On by default. */
  enabled: boolean;
  /** True while an Audio element is actively playing. */
  isPlaying: boolean;
  /** Whatever line is currently being spoken (for the caption bubble). */
  currentText: string | null;
  /** Timestamp (ms via performance.now or Date.now) of the last live cue. */
  lastCueAt: number;
  /** Trigger id of the last cue — used for dedupe in live-coach. */
  lastTriggerId: TriggerId | null;
  /** User-toggled mute. UI hides audio but live-coach still records cue events. */
  muted: boolean;

  setEnabled: (v: boolean) => void;
  setPlaying: (v: boolean) => void;
  setCurrentText: (t: string | null) => void;
  recordCue: (triggerId: TriggerId, atMs: number) => void;
  setMuted: (v: boolean) => void;
  toggleMuted: () => void;
  reset: () => void;
}

const INITIAL = {
  enabled: true,
  isPlaying: false,
  currentText: null as string | null,
  lastCueAt: 0,
  lastTriggerId: null as TriggerId | null,
  muted: false,
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...INITIAL,
  setEnabled: (enabled) => set({ enabled }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentText: (currentText) => set({ currentText }),
  recordCue: (triggerId, atMs) => set({ lastCueAt: atMs, lastTriggerId: triggerId }),
  setMuted: (muted) => set({ muted }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  reset: () => set({ ...INITIAL }),
}));

/**
 * Non-React access to current voice state. Useful inside imperative code
 * paths (event handlers, raf loops) where calling the hook would re-render.
 */
export function readVoiceState(): VoiceState {
  return useVoiceStore.getState();
}

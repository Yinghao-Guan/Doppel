/**
 * Voice playback state — independent from athlete-store so the two concerns
 * stay decoupled. Used by:
 *   - voice-client (writes isPlaying, currentText)
 *   - live-coach   (reads/writes lastCueAt + lastCueText for throttle/dedupe)
 *   - PoseCamera   (reads isPlaying for the status pill, mute for gating)
 *   - CoachCaption (reads currentText for the on-screen bubble)
 *   - SummaryAudioButton (reads isPlaying for play/pause icon swap)
 */
import { create } from "zustand";

interface VoiceState {
  /** Master switch. Off → no audio fetched or played. On by default. */
  enabled: boolean;
  /** True while an Audio element is actively playing. */
  isPlaying: boolean;
  /** Whatever line is currently being spoken (for the caption bubble). */
  currentText: string | null;
  /** Timestamp (ms via performance.now or Date.now) of the last live cue. */
  lastCueAt: number;
  /** Text of the last cue that fired — used for dedupe in live-coach. */
  lastCueText: string | null;
  /** User-toggled mute. UI hides audio but live-coach still records cue events. */
  muted: boolean;

  setEnabled: (v: boolean) => void;
  setPlaying: (v: boolean) => void;
  setCurrentText: (t: string | null) => void;
  recordCue: (text: string, atMs: number) => void;
  setMuted: (v: boolean) => void;
  toggleMuted: () => void;
  reset: () => void;
}

const INITIAL = {
  enabled: true,
  isPlaying: false,
  currentText: null as string | null,
  lastCueAt: 0,
  lastCueText: null as string | null,
  muted: false,
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...INITIAL,
  setEnabled: (enabled) => set({ enabled }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentText: (currentText) => set({ currentText }),
  recordCue: (text, atMs) => set({ lastCueAt: atMs, lastCueText: text }),
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

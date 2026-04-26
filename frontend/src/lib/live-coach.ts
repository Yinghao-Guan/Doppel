/**
 * Rule-based live coaching engine.
 *
 * Pure function: takes the rep history + last-cue state + current time,
 * returns the next coaching line to speak (or null = stay silent).
 *
 * Why rule-based and not LLM-driven? Latency. Reps land every ~2s; an LLM
 * round-trip is 1.5–3s. By the time the LLM responds the moment is gone.
 * The picker resolves in microseconds and the audio for common phrases is
 * pre-cached, so the user hears the cue within ~200ms of finishing the rep.
 *
 * Decisions are layered in this order:
 *   1. Compute every matching trigger for the latest rep / rolling stats.
 *   2. Sort by priority (high > medium > low).
 *   3. Anti-overlap: any cue within 1500ms of the previous one is suppressed.
 *   4. Soft-throttle: low-priority cues additionally suppressed for 4s.
 *   5. Anti-repeat: don't say the same thing twice in a row.
 *
 * `lastCueAt` and `lastCueText` should come from voice-store.
 */

import type { RepEvent } from "@/types/fingerprint";

export type CuePriority = "low" | "medium" | "high";

export interface CueResult {
  text: string;
  priority: CuePriority;
}

interface PickerState {
  lastCueAt: number;
  lastCueText: string | null;
}

const ANTI_OVERLAP_MS = 1500;
const LOW_PRIORITY_THROTTLE_MS = 4000;

const PRIORITY_RANK: Record<CuePriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Linear regression slope of y vs x. Used to detect form fatigue. */
function slope(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** All cue text the picker can ever emit — used for prefetching. */
export const COMMON_CUES: readonly string[] = [
  "Let's go.",
  "Go deeper.",
  "Even your knees.",
  "Slow it down.",
  "Don't pause too long.",
  "Beautiful form!",
  "Take a breather.",
  "Halfway there.",
  "Strong work.",
  "Set complete. Great work.",
];

/**
 * Decide what (if anything) the coach should say after the latest rep.
 * Returns null when silence is the right answer.
 */
export function pickCue(
  reps: readonly RepEvent[],
  state: PickerState,
  now: number = performance.now(),
): CueResult | null {
  if (reps.length === 0) return null;
  const latest = reps[reps.length - 1];

  const candidates: CueResult[] = [];

  // Form quality
  if (latest.formScore < 0.55) {
    candidates.push({ text: "Go deeper.", priority: "high" });
  }
  if (latest.asymmetryPct > 0.10) {
    candidates.push({ text: "Even your knees.", priority: "high" });
  }

  // Tempo
  if (latest.durationMs < 1200) {
    candidates.push({ text: "Slow it down.", priority: "medium" });
  } else if (latest.durationMs > 4500) {
    candidates.push({ text: "Don't pause too long.", priority: "medium" });
  }

  // Rolling stats (need ≥3 reps to be meaningful)
  if (reps.length >= 3) {
    const recent = reps.slice(-3);
    const allClean = recent.every((r) => r.formScore > 0.85);
    if (allClean) {
      candidates.push({ text: "Beautiful form!", priority: "low" });
    }

    const xs = reps.map((_, i) => i);
    const ys = reps.map((r) => r.formScore);
    const fatigue = slope(xs, ys) * reps.length;
    if (fatigue < -0.4) {
      candidates.push({ text: "Take a breather.", priority: "medium" });
    }
  }

  // Set milestones
  if (reps.length === 1) {
    candidates.push({ text: "Let's go.", priority: "low" });
  } else if (reps.length === 5) {
    candidates.push({ text: "Halfway there.", priority: "low" });
  } else if (reps.length === 10 || reps.length === 15) {
    candidates.push({ text: "Strong work.", priority: "low" });
  }

  if (candidates.length === 0) return null;

  // Highest priority wins. Within same priority, first declared wins
  // (so "Go deeper." beats "Even your knees." on a tie — order matters above).
  candidates.sort(
    (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority],
  );
  const top = candidates[0];

  const sinceLast = now - state.lastCueAt;

  // Anti-overlap: never speak over the previous line.
  if (sinceLast < ANTI_OVERLAP_MS) return null;

  // Soft-throttle: low-priority cues suppressed for an extra window.
  if (top.priority === "low" && sinceLast < LOW_PRIORITY_THROTTLE_MS) {
    return null;
  }

  // Anti-repeat: never say the same thing twice in a row.
  if (top.text === state.lastCueText) return null;

  return top;
}

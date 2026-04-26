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
 *   3. Anti-overlap: any cue within ANTI_OVERLAP_MS of the previous one is
 *      suppressed so coach lines never talk over each other.
 *   4. Soft-throttle: low-priority cues additionally suppressed for a few
 *      extra seconds so the coach isn't chatty about minor stuff.
 *   5. Anti-repeat: dedupe by `triggerId`, not text — so we never fire the
 *      same rule twice in a row even when its text variants differ.
 *
 * `lastCueAt` and `lastTriggerId` come from voice-store.
 */

import type { RepEvent } from "@/types/fingerprint";

export type CuePriority = "low" | "medium" | "high";

/** Stable identifier for each coaching trigger. Used for dedupe. */
export type TriggerId =
  | "first-rep"
  | "low-form"
  | "asymmetry"
  | "fast-tempo"
  | "slow-tempo"
  | "great-form"
  | "fatigue"
  | "milestone-half"
  | "milestone-strong";

export interface CueResult {
  text: string;
  triggerId: TriggerId;
  priority: CuePriority;
}

interface PickerState {
  lastCueAt: number;
  lastTriggerId: TriggerId | null;
}

const ANTI_OVERLAP_MS = 2500;
const LOW_PRIORITY_THROTTLE_MS = 5500;

const PRIORITY_RANK: Record<CuePriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * 1–2 sentence trainer-style lines, multiple variants per trigger so the
 * coach doesn't sound robotic when the same condition fires twice.
 *
 * Keep each variant ≤ ~12 words so the audio finishes in under ~3s.
 */
const VARIANTS: Record<TriggerId, readonly string[]> = {
  "first-rep": [
    "Here we go. Set the pace, own that first rep.",
    "Locked in. Make this first one count.",
    "Let's go. Smooth and controlled — find your rhythm.",
  ],
  "low-form": [
    "Drop those hips lower — get your thighs below parallel.",
    "Need more depth on this one. Sit back into the squat.",
    "Deeper this time. Push your hips back, chest up.",
  ],
  "asymmetry": [
    "Watch that knee track — keep both legs working evenly.",
    "Even those knees out, you're loading one side more than the other.",
    "Square your stance — both legs driving equally.",
  ],
  "fast-tempo": [
    "Slow it down. Control the descent, three-count down.",
    "Slower on the way down — own the eccentric.",
    "Ease off the speed. Strength is in the control.",
  ],
  "slow-tempo": [
    "Don't rest at the top — keep that tempo flowing.",
    "Stay moving, no pausing between reps.",
    "Keep it rolling. Reset and go.",
  ],
  "great-form": [
    "That's it — clean depth, knees tracking. Keep it locked in.",
    "Beautiful. Keep that exact pattern, every rep.",
    "Textbook reps. Don't change a thing.",
  ],
  "fatigue": [
    "Catch your breath. Your form's slipping — reset and reload.",
    "Take a beat. Recover, then come back stronger.",
    "Pause here. Better to reset than grind through bad reps.",
  ],
  "milestone-half": [
    "Halfway there. You're moving strong — finish it.",
    "Five down. Stay locked in for the back half.",
    "Halfway. Same form, same pace — bring it home.",
  ],
  "milestone-strong": [
    "That's strong work. Keep finding that depth.",
    "Big set, big effort. Keep stacking clean reps.",
    "Ten in the books. Don't slack on the rest.",
  ],
};

/** Speech for the End Set click — not part of the rule picker. */
export const END_SET_LINE =
  "Set complete. That was a strong effort — clean reps all the way.";

/** Every line the engine can ever speak — used by voice-client.prefetch. */
export const COMMON_CUES: readonly string[] = [
  ...Object.values(VARIANTS).flat(),
  END_SET_LINE,
];

/** Pick a random variant for a trigger. */
function variantFor(trigger: TriggerId): string {
  const list = VARIANTS[trigger];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

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

  const candidates: { triggerId: TriggerId; priority: CuePriority }[] = [];

  // Form quality
  if (latest.formScore < 0.55) {
    candidates.push({ triggerId: "low-form", priority: "high" });
  }
  if (latest.asymmetryPct > 0.10) {
    candidates.push({ triggerId: "asymmetry", priority: "high" });
  }

  // Tempo
  if (latest.durationMs < 1200) {
    candidates.push({ triggerId: "fast-tempo", priority: "medium" });
  } else if (latest.durationMs > 4500) {
    candidates.push({ triggerId: "slow-tempo", priority: "medium" });
  }

  // Rolling stats (need ≥3 reps to be meaningful)
  if (reps.length >= 3) {
    const recent = reps.slice(-3);
    const allClean = recent.every((r) => r.formScore > 0.85);
    if (allClean) {
      candidates.push({ triggerId: "great-form", priority: "low" });
    }

    const xs = reps.map((_, i) => i);
    const ys = reps.map((r) => r.formScore);
    const fatigue = slope(xs, ys) * reps.length;
    if (fatigue < -0.4) {
      candidates.push({ triggerId: "fatigue", priority: "medium" });
    }
  }

  // Set milestones
  if (reps.length === 1) {
    candidates.push({ triggerId: "first-rep", priority: "low" });
  } else if (reps.length === 5) {
    candidates.push({ triggerId: "milestone-half", priority: "low" });
  } else if (reps.length === 10 || reps.length === 15) {
    candidates.push({ triggerId: "milestone-strong", priority: "low" });
  }

  if (candidates.length === 0) return null;

  // Highest priority wins. Within same priority, first declared wins.
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

  // Anti-repeat: never fire the same trigger twice in a row, regardless of
  // which variant text would have come out. This keeps coaching feel fresh.
  if (top.triggerId === state.lastTriggerId) return null;

  return {
    text: variantFor(top.triggerId),
    triggerId: top.triggerId,
    priority: top.priority,
  };
}

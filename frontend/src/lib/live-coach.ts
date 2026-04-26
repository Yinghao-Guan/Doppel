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
import type { RealtimeState } from "@/lib/pose/analyzer";

export type CuePriority = "low" | "medium" | "high";

/** Stable identifier for each coaching trigger. Used for dedupe. */
export type TriggerId =
  // Rep-completion triggers (fired by pickCue on a counted rep)
  | "first-rep"
  | "low-form"
  | "asymmetry"
  | "fast-tempo"
  | "slow-tempo"
  | "great-form"
  | "fatigue"
  | "milestone-half"
  | "milestone-strong"
  // Real-time triggers (fired by pickRealtimeCue every frame)
  | "shallow-rep"
  | "standing-too-long"
  | "slow-descent"
  | "realtime-asymmetry"
  | "knee-valgus"
  | "forward-lean"
  // Filler — fired when nothing else matches and silence is too long
  | "filler";

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
/** A specific trigger may re-fire after this cooldown — keeps coaching active
 *  when the athlete has a persistent issue (e.g. shallow squat for 5 reps in a row). */
const SAME_TRIGGER_COOLDOWN_MS = 7000;
/** When no specific trigger fires, drop a motivational filler if it's been
 *  this long since the last cue. Keeps the coach feeling alive. */
const FILLER_INTERVAL_MS = 5000;
/** Time in neutral phase (standing) during a capture before "let's go" fires. */
const STANDING_TOO_LONG_MS = 5000;
/** Per-frame asymmetry above this during active movement triggers a cue. */
const REALTIME_ASYMMETRY_THRESHOLD = 0.10;

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
const VARIANTS: Record<Exclude<TriggerId, "filler">, readonly string[]> = {
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
  // Real-time triggers — fired during a movement, not after a counted rep.
  "shallow-rep": [
    "Deeper! That was a quarter rep — drop below parallel.",
    "Too shallow. Get those hips lower next one.",
    "Need real depth. Don't cut it short.",
  ],
  "standing-too-long": [
    "Let's go — drop into your next rep.",
    "Don't rest too long, keep the intensity up.",
    "Stay locked in. Reset and back into it.",
  ],
  "slow-descent": [
    "Don't stall on the way down. Keep it moving.",
    "Smooth descent, but don't pause halfway.",
    "Control it, but keep the tempo flowing.",
  ],
  "realtime-asymmetry": [
    "Even those knees — you're loading one side.",
    "Square that stance, both legs driving.",
    "Center your weight, stay balanced.",
  ],
  "knee-valgus": [
    "Knees out! Track them over your toes.",
    "Push those knees out — don't let them cave.",
    "Watch the knees, keep them in line with your feet.",
  ],
  "forward-lean": [
    "Chest up! Don't lean too far forward.",
    "Stay tall — pull that chest back up.",
    "Posture check — keep your torso upright.",
  ],
};

/** Speech for the End Set click — not part of the rule picker. */
export const END_SET_LINE =
  "Set complete. That was a strong effort — clean reps all the way.";

/**
 * Short motivational fillers fired when no specific issue/milestone matches
 * but it's been quiet for too long. Real PTs say something between every rep,
 * not just on detected issues — these keep the coach feeling active.
 */
const FILLERS: readonly string[] = [
  "Nice rep.",
  "Stay tight.",
  "Eyes forward, breathe through it.",
  "Drive through your heels.",
  "Keep that core engaged.",
  "Find your rhythm.",
  "You got this.",
  "Smooth and controlled.",
];

/** Every line the engine can ever speak — used by voice-client.prefetch. */
export const COMMON_CUES: readonly string[] = [
  ...Object.values(VARIANTS).flat(),
  ...FILLERS,
  END_SET_LINE,
];

/** Pick a random variant for a trigger. */
function variantFor(trigger: Exclude<TriggerId, "filler">): string {
  const list = VARIANTS[trigger];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

/** Pick a random filler. */
function pickFiller(): string {
  return FILLERS[Math.floor(Math.random() * FILLERS.length)];
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
  const sinceLast = now - state.lastCueAt;

  // Anti-overlap: never speak over the previous line. Applies to ALL cues
  // including fillers.
  if (sinceLast < ANTI_OVERLAP_MS) return null;

  type Candidate = { triggerId: Exclude<TriggerId, "filler">; priority: CuePriority };
  const candidates: Candidate[] = [];

  // Form quality (slightly more sensitive than v1 so cues fire reliably)
  if (latest.formScore < 0.65) {
    candidates.push({ triggerId: "low-form", priority: "high" });
  }
  if (latest.asymmetryPct > 0.08) {
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

  // Try the highest-priority real trigger first.
  if (candidates.length > 0) {
    candidates.sort(
      (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority],
    );
    const top = candidates[0];

    const lowPriorityBlocked =
      top.priority === "low" && sinceLast < LOW_PRIORITY_THROTTLE_MS;

    // Same-trigger cooldown (NOT strict no-repeat): the same issue can re-fire
    // after a few seconds, picking a different variant text so it doesn't sound
    // robotic. This keeps coaching active when the athlete has a persistent
    // problem like consistently shallow squats.
    const sameTriggerBlocked =
      top.triggerId === state.lastTriggerId &&
      sinceLast < SAME_TRIGGER_COOLDOWN_MS;

    if (!lowPriorityBlocked && !sameTriggerBlocked) {
      return {
        text: variantFor(top.triggerId),
        triggerId: top.triggerId,
        priority: top.priority,
      };
    }
  }

  // No specific trigger fits — drop in a motivational filler so the coach
  // doesn't go silent for long stretches.
  if (sinceLast >= FILLER_INTERVAL_MS) {
    return {
      text: pickFiller(),
      triggerId: "filler",
      priority: "low",
    };
  }

  return null;
}

/**
 * Real-time cue picker. Runs every camera frame from PoseCamera's RAF loop.
 * Operates on the per-frame RealtimeState (instead of completed reps) so it
 * fires for events that DON'T produce a counted rep — shallow squats, knees
 * caving in, forward lean, standing idle for too long, etc.
 *
 * Shares the same throttle/cooldown state in voice-store as `pickCue`, so a
 * realtime cue and a rep-completion cue can never overlap.
 *
 * Returns null when the user is between sets (`!isCapturing`), when nothing
 * meaningful is happening, or when throttle/cooldown blocks the candidate.
 */
export function pickRealtimeCue(
  realtime: RealtimeState,
  state: PickerState,
  isCapturing: boolean,
  now: number = performance.now(),
): CueResult | null {
  if (!isCapturing) return null;

  const sinceLast = now - state.lastCueAt;
  if (sinceLast < ANTI_OVERLAP_MS) return null;

  type Candidate = {
    triggerId: Exclude<TriggerId, "filler">;
    priority: CuePriority;
  };
  const candidates: Candidate[] = [];

  // Highest priority: visible form errors that need immediate correction.
  if (realtime.shallowRepDetected) {
    candidates.push({ triggerId: "shallow-rep", priority: "high" });
  }
  if (realtime.kneeValgusDetected) {
    candidates.push({ triggerId: "knee-valgus", priority: "high" });
  }
  if (realtime.forwardLeanDetected) {
    candidates.push({ triggerId: "forward-lean", priority: "high" });
  }
  if (
    realtime.movementPhase !== "neutral" &&
    realtime.currentAsymmetry > REALTIME_ASYMMETRY_THRESHOLD
  ) {
    candidates.push({ triggerId: "realtime-asymmetry", priority: "high" });
  }

  // Medium: pacing problems.
  if (realtime.slowDescentDetected) {
    candidates.push({ triggerId: "slow-descent", priority: "medium" });
  }
  if (
    realtime.movementPhase === "neutral" &&
    realtime.msInPhase > STANDING_TOO_LONG_MS
  ) {
    candidates.push({ triggerId: "standing-too-long", priority: "medium" });
  }

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority],
  );
  const top = candidates[0];

  // Same-trigger cooldown (shared semantics with pickCue).
  if (
    top.triggerId === state.lastTriggerId &&
    sinceLast < SAME_TRIGGER_COOLDOWN_MS
  ) {
    return null;
  }

  return {
    text: variantFor(top.triggerId),
    triggerId: top.triggerId,
    priority: top.priority,
  };
}

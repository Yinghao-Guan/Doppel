import type { RepEvent, TrainingFingerprint } from "@/types/fingerprint";
import { clamp } from "@/lib/utils";
import { L, SQUAT } from "./constants";
import type { Landmark } from "./types";

export type { Landmark } from "./types";

export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAb = Math.hypot(ab.x, ab.y);
  const magCb = Math.hypot(cb.x, cb.y);
  if (magAb === 0 || magCb === 0) return 180;
  const cos = clamp(dot / (magAb * magCb), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

type Phase = "standing" | "descending" | "ascending";
type MovementPhase = "neutral" | "descending" | "ascending";

/**
 * Snapshot of the live pose state, independent of whether a rep counted.
 *
 * Used by `pickRealtimeCue` to fire coaching cues mid-movement — even when
 * the rep state machine doesn't increment because the user did a shallow
 * squat that never crossed the bottom threshold.
 *
 * One-shot flags (`shallowRepDetected`, `slowDescentDetected`, etc.) stay
 * true until the consumer calls `consumeFlags()`. Per-frame values
 * (`currentKneeAngle`, `currentAsymmetry`, `movementPhase`, `msInPhase`)
 * always reflect the latest frame.
 */
export interface RealtimeState {
  movementPhase: MovementPhase;
  msInPhase: number;
  currentKneeAngle: number;
  currentAsymmetry: number;
  shallowRepDetected: boolean;
  slowDescentDetected: boolean;
  kneeValgusDetected: boolean;
  forwardLeanDetected: boolean;
}

// ── Realtime tuning constants ────────────────────────────────────────────
/** Knee angle below this counts as the start of a squat attempt. */
const MOVEMENT_ATTEMPT_THRESHOLD_DEG = 145;
/** Knee angle above this means the user is back to standing. */
const MOVEMENT_STAND_HOLD_DEG = 165;
/** movementMin must come within this of BOTTOM to count as deep enough.
 *  Otherwise the rep is flagged shallow. */
const SHALLOW_DEPTH_TOLERANCE_DEG = 8;
/** How much the angle must rise past movementMin to count as "ascending". */
const ASCEND_DETECT_DELTA_DEG = 8;
/** Descent that takes longer than this fires the slow-descent flag once. */
const SLOW_DESCENT_MS = 3500;
/** kneeWidth/ankleWidth below this for several frames = knees collapsing. */
const KNEE_VALGUS_RATIO = 0.85;
const KNEE_VALGUS_FRAMES = 3;
/** Hip-shoulder line angle from vertical (deg) above this = forward lean. */
const FORWARD_LEAN_DEG = 30;
const FORWARD_LEAN_FRAMES = 3;

export class SquatAnalyzer {
  // ── Rep state machine (committed reps) ───────────────────────────────
  private phase: Phase = "standing";
  private currentMin = 180;
  private currentMax = 180;
  private lastTransitionMs = 0;
  private reps: RepEvent[] = [];
  private framesBelow = 0;
  private framesAbove = 0;
  private asymSum = 0;
  private asymCount = 0;

  // ── Realtime tracking (every frame, independent of rep state) ─────────
  private movementPhase: MovementPhase = "neutral";
  private movementMin = 180;
  private movementStartMs = 0;
  private neutralStartMs = 0;
  private currentKneeAngle = 180;
  private currentAsymmetryFrame = 0;
  private valgusFrames = 0;
  private leanFrames = 0;

  // One-shot flags — set by ingest, cleared by consumeFlags()
  private shallowRepFlag = false;
  private slowDescentFlag = false;
  private slowDescentEmittedThisDescent = false;
  private kneeValgusFlag = false;
  private forwardLeanFlag = false;

  constructor() {
    const t = nowMs();
    this.lastTransitionMs = t;
    this.neutralStartMs = t;
  }

  /**
   * Feed one frame of landmarks. Returns the current rep count.
   * Visibility-gated: any leg landmark below MIN_VISIBILITY is skipped.
   */
  ingest(landmarks: Landmark[]): number {
    if (landmarks.length < 33) return this.reps.length;

    const lHip = landmarks[L.L_HIP];
    const lKnee = landmarks[L.L_KNEE];
    const lAnkle = landmarks[L.L_ANKLE];
    const rHip = landmarks[L.R_HIP];
    const rKnee = landmarks[L.R_KNEE];
    const rAnkle = landmarks[L.R_ANKLE];
    const lShoulder = landmarks[L.L_SHOULDER];
    const rShoulder = landmarks[L.R_SHOULDER];

    const required = [lHip, lKnee, lAnkle, rHip, rKnee, rAnkle];
    for (const lm of required) {
      if (!lm) return this.reps.length;
      if ((lm.visibility ?? 1) < SQUAT.MIN_VISIBILITY) return this.reps.length;
    }

    const lAngle = angleDeg(lHip, lKnee, lAnkle);
    const rAngle = angleDeg(rHip, rKnee, rAnkle);
    const kneeAngle = (lAngle + rAngle) / 2;

    this.currentMin = Math.min(this.currentMin, kneeAngle);
    this.currentMax = Math.max(this.currentMax, kneeAngle);
    this.asymSum += Math.abs(lAngle - rAngle) / 180;
    this.asymCount += 1;

    const now = nowMs();

    // ── Realtime per-frame snapshot ────────────────────────────────────
    this.currentKneeAngle = kneeAngle;
    this.currentAsymmetryFrame = Math.abs(lAngle - rAngle) / 180;

    // Knee valgus: ratio of knee-spread to ankle-spread
    const kneeWidth = Math.abs(lKnee.x - rKnee.x);
    const ankleWidth = Math.abs(lAnkle.x - rAnkle.x);
    const valgusRatio = ankleWidth > 0.01 ? kneeWidth / ankleWidth : 1;

    // Forward lean: angle of hip-shoulder line from vertical
    let leanDeg = 0;
    const shouldersOk =
      lShoulder &&
      rShoulder &&
      (lShoulder.visibility ?? 1) >= SQUAT.MIN_VISIBILITY &&
      (rShoulder.visibility ?? 1) >= SQUAT.MIN_VISIBILITY;
    if (shouldersOk) {
      const midShX = (lShoulder.x + rShoulder.x) / 2;
      const midShY = (lShoulder.y + rShoulder.y) / 2;
      const midHipX = (lHip.x + rHip.x) / 2;
      const midHipY = (lHip.y + rHip.y) / 2;
      const dx = Math.abs(midShX - midHipX);
      const dy = Math.abs(midShY - midHipY);
      leanDeg = (Math.atan2(dx, Math.max(dy, 0.001)) * 180) / Math.PI;
    }

    // ── Movement-phase state machine ──────────────────────────────────
    // Independent of the rep state machine — fires even on shallow attempts.
    if (this.movementPhase === "neutral") {
      if (kneeAngle < MOVEMENT_ATTEMPT_THRESHOLD_DEG) {
        this.movementPhase = "descending";
        this.movementMin = kneeAngle;
        this.movementStartMs = now;
        this.slowDescentEmittedThisDescent = false;
        this.valgusFrames = 0;
        this.leanFrames = 0;
      }
    } else if (this.movementPhase === "descending") {
      this.movementMin = Math.min(this.movementMin, kneeAngle);
      if (kneeAngle > this.movementMin + ASCEND_DETECT_DELTA_DEG) {
        // Started ascending. Was it deep enough?
        this.movementPhase = "ascending";
        if (
          this.movementMin >
          SQUAT.BOTTOM_ANGLE_DEG + SHALLOW_DEPTH_TOLERANCE_DEG
        ) {
          this.shallowRepFlag = true;
        }
      } else if (
        !this.slowDescentEmittedThisDescent &&
        now - this.movementStartMs > SLOW_DESCENT_MS
      ) {
        this.slowDescentFlag = true;
        this.slowDescentEmittedThisDescent = true;
      }
    } else if (this.movementPhase === "ascending") {
      if (kneeAngle > MOVEMENT_STAND_HOLD_DEG) {
        this.movementPhase = "neutral";
        this.movementMin = 180;
        this.neutralStartMs = now;
      }
    }

    const inActiveMovement = this.movementPhase !== "neutral";

    // Knee valgus accumulates only during active movement.
    if (inActiveMovement && valgusRatio < KNEE_VALGUS_RATIO) {
      this.valgusFrames += 1;
      if (this.valgusFrames >= KNEE_VALGUS_FRAMES) {
        this.kneeValgusFlag = true;
        this.valgusFrames = 0;
      }
    } else {
      this.valgusFrames = 0;
    }

    // Forward lean accumulates only during active movement.
    if (inActiveMovement && leanDeg > FORWARD_LEAN_DEG) {
      this.leanFrames += 1;
      if (this.leanFrames >= FORWARD_LEAN_FRAMES) {
        this.forwardLeanFlag = true;
        this.leanFrames = 0;
      }
    } else {
      this.leanFrames = 0;
    }

    // ── Rep state machine (UNCHANGED — committed reps only) ───────────
    const isBelow = kneeAngle < SQUAT.BOTTOM_ANGLE_DEG;
    const isAbove = kneeAngle > SQUAT.STAND_ANGLE_DEG;

    if (isBelow) {
      this.framesBelow += 1;
      this.framesAbove = 0;
    } else if (isAbove) {
      this.framesAbove += 1;
      this.framesBelow = 0;
    } else {
      this.framesBelow = 0;
      this.framesAbove = 0;
    }

    if (
      this.phase === "standing" &&
      this.framesBelow >= SQUAT.MIN_FRAMES_FOR_TRANSITION
    ) {
      this.phase = "descending";
      this.lastTransitionMs = now;
      this.currentMin = kneeAngle;
      this.currentMax = kneeAngle;
      this.asymSum = 0;
      this.asymCount = 0;
      this.framesBelow = 0;
    } else if (
      this.phase === "descending" &&
      this.framesAbove >= SQUAT.MIN_FRAMES_FOR_TRANSITION
    ) {
      const durationMs = now - this.lastTransitionMs;
      this.framesAbove = 0;

      if (
        durationMs >= SQUAT.MIN_REP_DURATION_MS &&
        durationMs <= SQUAT.MAX_REP_DURATION_MS
      ) {
        const asymmetry =
          this.asymCount > 0 ? this.asymSum / this.asymCount : 0;
        const depthScore = clamp((180 - this.currentMin - 70) / 30, 0, 1);
        const asymmetryPenalty = clamp(asymmetry * 4, 0, 0.4);
        const formScore = clamp(depthScore - asymmetryPenalty, 0, 1);

        this.reps.push({
          index: this.reps.length + 1,
          durationMs,
          minKneeAngle: this.currentMin,
          maxKneeAngle: this.currentMax,
          formScore,
          asymmetryPct: clamp(asymmetry, 0, 1),
        });
      }

      this.phase = "standing";
      this.currentMin = 180;
      this.currentMax = 180;
      this.lastTransitionMs = now;
      this.asymSum = 0;
      this.asymCount = 0;
    }

    return this.reps.length;
  }

  /** Last completed rep's form score, or null if none yet. Used by FormPill. */
  getLastFormScore(): number | null {
    if (this.reps.length === 0) return null;
    return this.reps[this.reps.length - 1].formScore;
  }

  /**
   * Snapshot current realtime pose state. Cheap (no allocation beyond the
   * returned object) — safe to call every frame.
   */
  getRealtimeState(now: number = nowMs()): RealtimeState {
    const msInPhase =
      this.movementPhase === "neutral"
        ? now - this.neutralStartMs
        : now - this.movementStartMs;
    return {
      movementPhase: this.movementPhase,
      msInPhase,
      currentKneeAngle: this.currentKneeAngle,
      currentAsymmetry: this.currentAsymmetryFrame,
      shallowRepDetected: this.shallowRepFlag,
      slowDescentDetected: this.slowDescentFlag,
      kneeValgusDetected: this.kneeValgusFlag,
      forwardLeanDetected: this.forwardLeanFlag,
    };
  }

  /**
   * Clear all one-shot realtime flags. Call after consuming a flag (e.g.
   * after firing the corresponding voice cue) so the same condition has to
   * be re-detected before firing again.
   */
  consumeFlags(): void {
    this.shallowRepFlag = false;
    this.slowDescentFlag = false;
    this.kneeValgusFlag = false;
    this.forwardLeanFlag = false;
  }

  finish(): TrainingFingerprint {
    const reps = this.reps;
    const n = reps.length;

    if (n === 0) {
      return {
        exercise: "squat",
        totalReps: 0,
        avgFormScore: 0,
        avgRangeOfMotion: 0,
        tempoConsistency: 0,
        asymmetryAvg: 0,
        fatigueTrend: 0,
        injuryRiskMarkers: [],
        reps: [],
        timestamp: Date.now(),
      };
    }

    const avgFormScore = reps.reduce((s, r) => s + r.formScore, 0) / n;
    const asymmetryAvg = reps.reduce((s, r) => s + r.asymmetryPct, 0) / n;
    const avgDepth = reps.reduce((s, r) => s + (180 - r.minKneeAngle), 0) / n;
    const avgRangeOfMotion = clamp(avgDepth / 90, 0, 1);

    const durations = reps.map((r) => r.durationMs);
    const meanDur = durations.reduce((s, d) => s + d, 0) / n;
    const variance =
      durations.reduce((s, d) => s + (d - meanDur) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const tempoConsistency = clamp(1 - stdDev / Math.max(meanDur, 1), 0, 1);

    let fatigueTrend = 0;
    if (n >= 3) {
      const xs = reps.map((_, i) => i);
      const ys = reps.map((r) => r.formScore);
      fatigueTrend = clamp(linearSlope(xs, ys) * n, -1, 1);
    }

    const injuryRiskMarkers: string[] = [];
    if (asymmetryAvg > 0.08) injuryRiskMarkers.push("L/R asymmetry");
    if (avgFormScore < 0.55) injuryRiskMarkers.push("low form score");
    if (fatigueTrend < -0.4) injuryRiskMarkers.push("fatigue collapse");

    return {
      exercise: "squat",
      totalReps: n,
      avgFormScore: clamp(avgFormScore, 0, 1),
      avgRangeOfMotion,
      tempoConsistency,
      asymmetryAvg: clamp(asymmetryAvg, 0, 1),
      fatigueTrend,
      injuryRiskMarkers,
      reps,
      timestamp: Date.now(),
    };
  }

  reset(): void {
    const t = nowMs();
    this.phase = "standing";
    this.currentMin = 180;
    this.currentMax = 180;
    this.lastTransitionMs = t;
    this.reps = [];
    this.framesBelow = 0;
    this.framesAbove = 0;
    this.asymSum = 0;
    this.asymCount = 0;

    this.movementPhase = "neutral";
    this.movementMin = 180;
    this.movementStartMs = 0;
    this.neutralStartMs = t;
    this.currentKneeAngle = 180;
    this.currentAsymmetryFrame = 0;
    this.valgusFrames = 0;
    this.leanFrames = 0;
    this.shallowRepFlag = false;
    this.slowDescentFlag = false;
    this.slowDescentEmittedThisDescent = false;
    this.kneeValgusFlag = false;
    this.forwardLeanFlag = false;
  }
}

function linearSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
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

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

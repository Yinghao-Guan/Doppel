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

/**
 * Compute the knee angle for one leg, but only if all three landmarks
 * (hip, knee, ankle) clear the visibility threshold. Returns null when the
 * leg can't be reliably measured this frame.
 *
 * Used by the bilateral fallback: if one side is occluded (e.g. user
 * standing sideways to the camera), we still count reps using the visible
 * side instead of skipping the frame entirely.
 */
function evaluateLeg(
  hip: Landmark | undefined,
  knee: Landmark | undefined,
  ankle: Landmark | undefined,
): number | null {
  if (!hip || !knee || !ankle) return null;
  if (
    (hip.visibility ?? 1) < SQUAT.MIN_VISIBILITY ||
    (knee.visibility ?? 1) < SQUAT.MIN_VISIBILITY ||
    (ankle.visibility ?? 1) < SQUAT.MIN_VISIBILITY
  ) {
    return null;
  }
  return angleDeg(hip, knee, ankle);
}

type Phase = "standing" | "descending" | "ascending";

export class SquatAnalyzer {
  private phase: Phase = "standing";
  private currentMin = 180;
  private currentMax = 180;
  private lastTransitionMs = 0;
  private reps: RepEvent[] = [];
  private framesBelow = 0;
  private framesAbove = 0;
  private asymSum = 0;
  private asymCount = 0;

  constructor() {
    this.lastTransitionMs = nowMs();
  }

  ingest(landmarks: Landmark[]): number {
    if (landmarks.length < 33) return this.reps.length;

    const lHip = landmarks[L.L_HIP];
    const lKnee = landmarks[L.L_KNEE];
    const lAnkle = landmarks[L.L_ANKLE];
    const rHip = landmarks[L.R_HIP];
    const rKnee = landmarks[L.R_KNEE];
    const rAnkle = landmarks[L.R_ANKLE];

    // Bilateral fallback: count reps as long as at least ONE leg is fully
    // visible. The user often stands sideways, so the camera-far leg is
    // partially occluded — but the camera-near leg is enough for rep
    // detection. Asymmetry only contributes to the running average on
    // frames where BOTH sides are clearly visible.
    const lAngle = evaluateLeg(lHip, lKnee, lAnkle);
    const rAngle = evaluateLeg(rHip, rKnee, rAnkle);

    if (lAngle === null && rAngle === null) {
      return this.reps.length;
    }

    let kneeAngle: number;
    if (lAngle !== null && rAngle !== null) {
      kneeAngle = (lAngle + rAngle) / 2;
      this.asymSum += Math.abs(lAngle - rAngle) / 180;
      this.asymCount += 1;
    } else {
      // One-sided frame — use whichever leg is visible. Skip asymmetry
      // contribution (we can't measure it without both sides) but still
      // drive the rep state machine, which only cares about knee flexion.
      kneeAngle = lAngle ?? rAngle ?? 180;
    }

    this.currentMin = Math.min(this.currentMin, kneeAngle);
    this.currentMax = Math.max(this.currentMax, kneeAngle);

    const now = nowMs();
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

  getLastFormScore(): number | null {
    if (this.reps.length === 0) return null;
    return this.reps[this.reps.length - 1].formScore;
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
    this.phase = "standing";
    this.currentMin = 180;
    this.currentMax = 180;
    this.lastTransitionMs = nowMs();
    this.reps = [];
    this.framesBelow = 0;
    this.framesAbove = 0;
    this.asymSum = 0;
    this.asymCount = 0;
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

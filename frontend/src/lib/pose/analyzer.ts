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

/**
 * Diagnostic logging — DEV ONLY. Flip to false to silence.
 * Removed entirely in the follow-up fix PR; this file is on a temporary
 * `diagnose-rep-detection` branch for data collection.
 */
const DIAG = true;
const SNAPSHOT_EVERY_N_FRAMES = 30; // ~once a second at 30fps

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
  private frameCounter = 0; // diag only

  constructor() {
    this.lastTransitionMs = nowMs();
    if (DIAG) console.log("[analyzer] constructor — fresh instance");
  }

  ingest(landmarks: Landmark[]): number {
    if (landmarks.length < 33) {
      if (DIAG) console.log("[analyzer] frame skipped: <33 landmarks");
      return this.reps.length;
    }

    const lHip = landmarks[L.L_HIP];
    const lKnee = landmarks[L.L_KNEE];
    const lAnkle = landmarks[L.L_ANKLE];
    const rHip = landmarks[L.R_HIP];
    const rKnee = landmarks[L.R_KNEE];
    const rAnkle = landmarks[L.R_ANKLE];

    const required = [lHip, lKnee, lAnkle, rHip, rKnee, rAnkle];
    const labels = ["L_HIP", "L_KNEE", "L_ANKLE", "R_HIP", "R_KNEE", "R_ANKLE"];
    for (let i = 0; i < required.length; i++) {
      const lm = required[i];
      if (!lm) {
        if (DIAG) console.log(`[analyzer] frame skipped: missing ${labels[i]}`);
        return this.reps.length;
      }
      const vis = lm.visibility ?? 1;
      if (vis < SQUAT.MIN_VISIBILITY) {
        if (DIAG)
          console.log(
            `[analyzer] frame skipped: low visibility on ${labels[i]} (${vis.toFixed(2)})`,
          );
        return this.reps.length;
      }
    }

    const lAngle = angleDeg(lHip, lKnee, lAnkle);
    const rAngle = angleDeg(rHip, rKnee, rAnkle);
    const kneeAngle = (lAngle + rAngle) / 2;

    this.currentMin = Math.min(this.currentMin, kneeAngle);
    this.currentMax = Math.max(this.currentMax, kneeAngle);
    this.asymSum += Math.abs(lAngle - rAngle) / 180;
    this.asymCount += 1;

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
      if (DIAG)
        console.log(
          `[analyzer] standing → descending  framesBelow=${this.framesBelow}  kneeAngle=${kneeAngle.toFixed(1)}  t=${now.toFixed(0)}`,
        );
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

      const validDuration =
        durationMs >= SQUAT.MIN_REP_DURATION_MS &&
        durationMs <= SQUAT.MAX_REP_DURATION_MS;

      if (validDuration) {
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
        if (DIAG)
          console.log(
            `[analyzer] descending → standing  framesAbove=3  durationMs=${durationMs.toFixed(0)}  depth=${(180 - this.currentMin).toFixed(1)}  formScore=${formScore.toFixed(2)}  ✅ REP #${this.reps.length} COMMITTED`,
          );
      } else {
        const reason =
          durationMs < SQUAT.MIN_REP_DURATION_MS
            ? `too short (${durationMs.toFixed(0)}ms < ${SQUAT.MIN_REP_DURATION_MS}ms)`
            : `too long (${durationMs.toFixed(0)}ms > ${SQUAT.MAX_REP_DURATION_MS}ms)`;
        if (DIAG)
          console.log(
            `[analyzer] descending → standing  framesAbove=3  durationMs=${durationMs.toFixed(0)}  depth=${(180 - this.currentMin).toFixed(1)}  ❌ REP REJECTED (${reason})`,
          );
      }

      this.phase = "standing";
      this.currentMin = 180;
      this.currentMax = 180;
      this.lastTransitionMs = now;
      this.asymSum = 0;
      this.asymCount = 0;
    }

    // Periodic snapshot so we can see what the state looks like even when
    // no transitions are firing (the failure mode is "stuck and silent").
    this.frameCounter += 1;
    if (DIAG && this.frameCounter % SNAPSHOT_EVERY_N_FRAMES === 0) {
      console.log(
        `[analyzer] state  phase=${this.phase}  kneeAngle=${kneeAngle.toFixed(1)}  currentMin=${this.currentMin.toFixed(1)}  framesBelow=${this.framesBelow}  framesAbove=${this.framesAbove}  reps=${this.reps.length}  msSinceTrans=${(now - this.lastTransitionMs).toFixed(0)}`,
      );
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
    if (DIAG)
      console.log(
        `[analyzer] reset() called — clearing state (was: phase=${this.phase}, reps=${this.reps.length})`,
      );
    this.phase = "standing";
    this.currentMin = 180;
    this.currentMax = 180;
    this.lastTransitionMs = nowMs();
    this.reps = [];
    this.framesBelow = 0;
    this.framesAbove = 0;
    this.asymSum = 0;
    this.asymCount = 0;
    this.frameCounter = 0;
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

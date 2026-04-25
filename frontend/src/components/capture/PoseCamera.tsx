"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { Camera, Square, Play } from "lucide-react";
import { SquatAnalyzer } from "@/lib/pose/analyzer";
import type { Landmark } from "@/lib/pose/types";
import { MOCK_FINGERPRINT } from "@/lib/pose/mockData";
import { useAthleteStore } from "@/lib/athlete-store";
import type { RepEvent, TrainingFingerprint } from "@/types/fingerprint";
import { clamp } from "@/lib/utils";
import { drawSkeleton } from "./SkeletonOverlay";
import { CameraError, type CameraErrorKind } from "./CameraError";
import { FormPill } from "./FormPill";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const DEMO_REP_INTERVAL_MS = 700;
const DEMO_TARGET_REPS = 5;
const EMPTY_FINGERPRINT: TrainingFingerprint = {
  exercise: "squat",
  totalReps: 0,
  avgFormScore: 0,
  avgRangeOfMotion: 0,
  tempoConsistency: 0,
  asymmetryAvg: 0,
  fatigueTrend: 0,
  injuryRiskMarkers: [],
  reps: [],
  timestamp: 0,
};

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
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

function buildFingerprintFromReps(reps: RepEvent[]): TrainingFingerprint {
  const n = reps.length;
  if (n === 0) {
    return { ...EMPTY_FINGERPRINT, timestamp: Date.now() };
  }

  const avgFormScore = reps.reduce((s, r) => s + r.formScore, 0) / n;
  const asymmetryAvg = reps.reduce((s, r) => s + r.asymmetryPct, 0) / n;
  const avgDepth = reps.reduce((s, r) => s + (180 - r.minKneeAngle), 0) / n;
  const avgRangeOfMotion = clamp(avgDepth / 90, 0, 1);

  const durations = reps.map((r) => r.durationMs);
  const meanDur = durations.reduce((s, d) => s + d, 0) / n;
  const variance = durations.reduce((s, d) => s + (d - meanDur) ** 2, 0) / n;
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

export function PoseCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const analyzerRef = useRef<SquatAnalyzer>(new SquatAnalyzer());
  const rafRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CameraErrorKind | null>(null);
  const [reps, setReps] = useState(0);
  const [liveFormScore, setLiveFormScore] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const setFingerprint = useAthleteStore((s) => s.setFingerprint);
  const isDemo = isDemoMode();

  useEffect(() => {
    if (isDemo) {
      setReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        if (cancelled) return;

        const lm = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
          outputSegmentationMasks: false,
        });
        if (cancelled) { lm.close(); return; }
        landmarkerRef.current = lm;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (cancelled) return;
        setReady(true);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof DOMException) {
          if (e.name === "NotAllowedError") setError("denied");
          else if (e.name === "NotFoundError") setError("missing");
          else setError("loading_failed");
        } else {
          setError("loading_failed");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const v = videoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (v) v.srcObject = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [isDemo]);

  const loop = useCallback(function runLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;

    if (!video || !canvas || !lm) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }

    if (video.readyState >= 2 && video.videoWidth > 0) {
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const result: PoseLandmarkerResult = lm.detectForVideo(
            video,
            performance.now(),
          );
          const landmarks = (result.landmarks?.[0] ?? []) as Landmark[];

          if (landmarks.length > 0) {
            const analyzer = analyzerRef.current;
            const latestForm = analyzer.getLastFormScore();
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height, latestForm);

            const count = analyzer.ingest(landmarks);
            if (count !== reps) {
              setReps(count);
              if (isCapturing) {
                setFingerprint(analyzer.finish());
              }
            }

            const newForm = analyzer.getLastFormScore();
            if (newForm !== liveFormScore) setLiveFormScore(newForm);
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, [reps, liveFormScore, isCapturing, setFingerprint]);

  useEffect(() => {
    if (!ready || error || isDemo) return;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, error, isDemo, loop]);

  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
    };
  }, []);

  const start = () => {
    if (isDemo) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      setReps(0);
      setLiveFormScore(null);
      setIsCapturing(true);
      setFingerprint({ ...EMPTY_FINGERPRINT, timestamp: Date.now() });
      let fakeRep = 0;
      demoIntervalRef.current = setInterval(() => {
        fakeRep++;
        setReps(fakeRep);
        setLiveFormScore(MOCK_FINGERPRINT.reps[fakeRep - 1]?.formScore ?? null);
        setFingerprint(
          buildFingerprintFromReps(MOCK_FINGERPRINT.reps.slice(0, fakeRep)),
        );
        if (fakeRep >= DEMO_TARGET_REPS) {
          if (demoIntervalRef.current) {
            clearInterval(demoIntervalRef.current);
            demoIntervalRef.current = null;
          }
          setIsCapturing(false);
        }
      }, DEMO_REP_INTERVAL_MS);
      return;
    }

    analyzerRef.current.reset();
    setReps(0);
    setLiveFormScore(null);
    setFingerprint({ ...EMPTY_FINGERPRINT, timestamp: Date.now() });
    setIsCapturing(true);
  };

  const stop = () => {
    if (isDemo) return;
    const fp = analyzerRef.current.finish();
    setFingerprint(fp);
    setIsCapturing(false);
  };

  const retry = () => {
    setError(null);
    if (typeof window !== "undefined") window.location.reload();
  };

  const startDisabled = !ready && !isDemo;

  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
        />

        {/* Status pills */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--glass-border)] bg-[var(--surface)]/60 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-[var(--fg-dim)]">
            <Camera
              size={10}
              strokeWidth={2}
              className="mr-1 inline-block align-middle"
            />
            {ready ? "Live" : "Loading…"}
          </span>
          {isDemo && (
            <span
              className="rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.2em]"
              style={{
                borderColor: "var(--warn)",
                background: "color-mix(in srgb, var(--warn) 15%, transparent)",
                color: "var(--warn)",
              }}
            >
              Demo
            </span>
          )}
          {isCapturing && (
            <span
              className="rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.2em]"
              style={{
                borderColor: "var(--danger)",
                background:
                  "color-mix(in srgb, var(--danger) 15%, transparent)",
                color: "var(--danger)",
              }}
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)] align-middle" />
              REC
            </span>
          )}
          <FormPill liveFormScore={liveFormScore} />
        </div>

        {/* Rep counter */}
        <div className="glass absolute right-4 top-4 rounded-xl px-4 py-2 text-right">
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
            REPS
          </p>
          <p className="font-display text-3xl font-medium tabular-nums text-[var(--fg)]">
            {reps}
          </p>
        </div>

        {error && <CameraError kind={error} onRetry={retry} />}
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-[var(--fg-mute)]">
          {isCapturing
            ? "Performing squats — keep your full body in frame."
            : "Click Start, then perform 5–10 squats."}
        </p>
        <div className="flex gap-2">
          {!isCapturing ? (
            <button
              onClick={start}
              disabled={startDisabled}
              className="cta cta-primary"
            >
              <Play size={14} /> Start Set
            </button>
          ) : (
            <button onClick={stop} className="cta cta-primary">
              <Square size={14} /> End Set
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * PERSON 1 — main CV component.
 *
 * Responsibilities:
 *   - Request webcam access (skipped in ?demo=1 mode).
 *   - Load MediaPipe Pose Landmarker (WASM + lite model from CDN).
 *   - Run detection on the RAF loop with a `lastVideoTime` guard so we
 *     don't re-process the same camera frame on > 60Hz displays.
 *   - Feed landmarks into the SquatAnalyzer, mirror live form score and
 *     rep count back into local state, draw the skeleton.
 *   - On End Set, build the TrainingFingerprint and push to the store.
 *   - In demo mode, simulate a 5-rep set in 3.5s and emit MOCK_FINGERPRINT.
 *   - Surface typed error states (denied / missing / loading_failed).
 */

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
import { useAthleteStore } from "@/lib/store/useAthleteStore";
import { drawSkeleton } from "./SkeletonOverlay";
import { CameraError, type CameraErrorKind } from "./CameraError";
import { FormPill } from "./FormPill";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const DEMO_REP_INTERVAL_MS = 700;
const DEMO_TARGET_REPS = 5;

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
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

  const isCapturing = useAthleteStore((s) => s.isCapturing);
  const setCapturing = useAthleteStore((s) => s.setCapturing);
  const setFingerprint = useAthleteStore((s) => s.setFingerprint);

  const isDemo = isDemoMode();

  // ───────────────────────────────────────────────────────────────────────
  // Setup: load model + start camera (skipped in demo mode).
  // ───────────────────────────────────────────────────────────────────────
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
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
          outputSegmentationMasks: false,
        });
        if (cancelled) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

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

  // ───────────────────────────────────────────────────────────────────────
  // Detection loop. Uses lastVideoTime guard to avoid double-processing.
  // ───────────────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;

    if (!video || !canvas || !lm) {
      rafRef.current = requestAnimationFrame(loop);
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
            performance.now()
          );
          const landmarks = (result.landmarks?.[0] ?? []) as Landmark[];

          if (landmarks.length > 0) {
            const analyzer = analyzerRef.current;
            const latestForm = analyzer.getLastFormScore();
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height, latestForm);

            const count = analyzer.ingest(landmarks);
            if (count !== reps) setReps(count);

            const newForm = analyzer.getLastFormScore();
            if (newForm !== liveFormScore) setLiveFormScore(newForm);
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [reps, liveFormScore]);

  useEffect(() => {
    if (!ready) return;
    if (error) return;
    if (isDemo) return;

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, error, isDemo, loop]);

  // ───────────────────────────────────────────────────────────────────────
  // Cleanup demo interval on unmount.
  // ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────────
  const start = () => {
    if (isDemo) {
      // Clear any existing demo interval (rapid-click guard).
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      setReps(0);
      setLiveFormScore(null);
      setCapturing(true);
      let fakeRep = 0;
      demoIntervalRef.current = setInterval(() => {
        fakeRep++;
        setReps(fakeRep);
        if (fakeRep >= DEMO_TARGET_REPS) {
          if (demoIntervalRef.current) {
            clearInterval(demoIntervalRef.current);
            demoIntervalRef.current = null;
          }
          setFingerprint({ ...MOCK_FINGERPRINT, timestamp: Date.now() });
          setCapturing(false);
        }
      }, DEMO_REP_INTERVAL_MS);
      return;
    }

    analyzerRef.current.reset();
    setReps(0);
    setLiveFormScore(null);
    setCapturing(true);
  };

  const stop = () => {
    if (isDemo) {
      // Demo's interval finalizes by itself; nothing to do.
      return;
    }
    const fp = analyzerRef.current.finish();
    setFingerprint(fp);
    setCapturing(false);
  };

  const retry = () => {
    setError(null);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────
  const startDisabled = !ready && !isDemo;

  return (
    <div className="card-elevated relative overflow-hidden p-0">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
        />

        {/* Status pills */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className="pill">
            <Camera className="w-3 h-3" />
            {ready ? "Live" : "Loading…"}
          </span>
          {isDemo && (
            <span className="pill border-accent-amber/40 bg-accent-amber/20 text-accent-amber">
              Demo Mode
            </span>
          )}
          {isCapturing && (
            <span className="pill border-accent text-accent">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              Recording
            </span>
          )}
          <FormPill liveFormScore={liveFormScore} />
        </div>

        {/* Rep counter */}
        <div className="absolute top-4 right-4 card px-4 py-2 text-right">
          <div className="h-section">Reps</div>
          <div className="text-3xl font-bold tabular-nums">{reps}</div>
        </div>

        {error && <CameraError kind={error} onRetry={retry} />}
      </div>

      <div className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {isCapturing
            ? "Performing squats — keep your full body in frame."
            : "Click Start, then perform 5–10 squats."}
        </p>
        <div className="flex gap-2">
          {!isCapturing ? (
            <button
              onClick={start}
              className="btn btn-primary"
              disabled={startDisabled}
            >
              <Play className="w-4 h-4" /> Start Set
            </button>
          ) : (
            <button onClick={stop} className="btn btn-primary">
              <Square className="w-4 h-4" /> End Set
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

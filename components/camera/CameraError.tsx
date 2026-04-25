"use client";

/**
 * PERSON 1 — friendly error overlay for camera/model failures.
 *
 * Rendered absolutely-positioned inside the camera card. Three discrete
 * failure modes map to distinct copy and an optional retry CTA.
 */

import { Camera, AlertTriangle } from "lucide-react";

export type CameraErrorKind = "denied" | "missing" | "loading_failed";

interface CameraErrorProps {
  kind: CameraErrorKind;
  onRetry?: () => void;
}

const COPY: Record<CameraErrorKind, { title: string; body: string }> = {
  denied: {
    title: "Camera permission denied",
    body: "Allow camera access in your browser to run a live set, or open ?demo=1 to use mock data.",
  },
  missing: {
    title: "No camera detected",
    body: "Plug in a webcam or open ?demo=1 to use mock data.",
  },
  loading_failed: {
    title: "Pose model failed to load",
    body: "Check your connection and reload, or open ?demo=1 to use mock data.",
  },
};

export function CameraError({ kind, onRetry }: CameraErrorProps) {
  const copy = COPY[kind];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10">
      <div className="card text-center max-w-md mx-4">
        <AlertTriangle className="w-8 h-8 text-accent-amber mx-auto mb-2" />
        <h3 className="font-semibold">{copy.title}</h3>
        <p className="text-sm text-muted mt-1">{copy.body}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-primary mt-4">
            <Camera className="w-4 h-4" /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

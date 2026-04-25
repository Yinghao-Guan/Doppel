"use client";

import { Camera, AlertTriangle } from "lucide-react";

export type CameraErrorKind = "denied" | "missing" | "loading_failed";

const COPY: Record<CameraErrorKind, { title: string; body: string }> = {
  denied: {
    title: "Camera permission denied",
    body: "Allow camera access in your browser to run a live set, or add ?demo=1 to the URL to use mock data.",
  },
  missing: {
    title: "No camera detected",
    body: "Plug in a webcam, or add ?demo=1 to the URL to use mock data.",
  },
  loading_failed: {
    title: "Pose model failed to load",
    body: "Check your connection and reload, or add ?demo=1 to the URL to use mock data.",
  },
};

export function CameraError({
  kind,
  onRetry,
}: {
  kind: CameraErrorKind;
  onRetry?: () => void;
}) {
  const copy = COPY[kind];
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85">
      <div className="glass mx-4 max-w-md rounded-2xl p-6 text-center">
        <AlertTriangle
          size={28}
          strokeWidth={1.6}
          className="mx-auto mb-3 text-[var(--warn)]"
        />
        <h3 className="font-display text-lg font-medium text-[var(--fg)]">
          {copy.title}
        </h3>
        <p className="mt-2 text-sm text-[var(--fg-dim)]">{copy.body}</p>
        {onRetry && (
          <button onClick={onRetry} className="cta cta-primary mt-5">
            <Camera size={14} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

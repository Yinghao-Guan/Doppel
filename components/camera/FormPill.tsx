"use client";

/**
 * PERSON 1 — live form-score pill.
 *
 * Tints green/amber/red by score, pulses for visual feedback. Returns null
 * when no score is available yet (no reps detected).
 */

interface FormPillProps {
  liveFormScore: number | null;
}

function tintFor(score: number): string {
  if (score >= 0.7) {
    return "bg-accent-green/20 text-accent-green border-accent-green/40";
  }
  if (score >= 0.5) {
    return "bg-accent-amber/20 text-accent-amber border-accent-amber/40";
  }
  return "bg-accent-red/20 text-accent-red border-accent-red/40";
}

export function FormPill({ liveFormScore }: FormPillProps) {
  if (liveFormScore == null) return null;
  const tint = tintFor(liveFormScore);
  return (
    <span className={`pill ${tint} animate-pulse`}>
      Form {Math.round(liveFormScore * 100)}%
    </span>
  );
}

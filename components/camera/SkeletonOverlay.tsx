/**
 * PERSON 1 — pure canvas drawing helpers. No React, no state.
 *
 * Draws the pose skeleton onto a 2D canvas, colored by current form score
 * so the user gets immediate visual feedback during a set.
 */

import type { Landmark } from "@/lib/pose/types";
import { CONNECTIONS } from "@/lib/pose/constants";

const MIN_VISIBILITY = 0.3;
const LINE_WIDTH = 4;
const DOT_RADIUS = 4;
const SHADOW_BLUR = 8;

function colorForFormScore(formScore: number | null | undefined): string {
  if (formScore == null) return "#7c5cff"; // accent purple — neutral
  if (formScore >= 0.7) return "#34d399"; // accent green
  if (formScore >= 0.5) return "#fbbf24"; // accent amber
  return "#f87171"; // accent red
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number,
  formScore?: number | null
): void {
  const accent = colorForFormScore(formScore);

  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = SHADOW_BLUR;

  for (const [a, b] of CONNECTIONS) {
    const la = landmarks[a];
    const lb = landmarks[b];
    if (!la || !lb) continue;
    if ((la.visibility ?? 1) < MIN_VISIBILITY) continue;
    if ((lb.visibility ?? 1) < MIN_VISIBILITY) continue;
    ctx.beginPath();
    ctx.moveTo(la.x * w, la.y * h);
    ctx.lineTo(lb.x * w, lb.y * h);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = accent;
  for (const lm of landmarks) {
    if (!lm) continue;
    if ((lm.visibility ?? 1) < MIN_VISIBILITY) continue;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

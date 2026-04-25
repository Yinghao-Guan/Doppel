/**
 * PERSON 1 — pose pipeline constants.
 *
 * One place to tune all squat detection thresholds. Calibration notes go here
 * so that tomorrow's "why did you pick 110 for the bottom?" question has an
 * answer that survives the demo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CALIBRATION NOTES
 * ─────────────────────────────────────────────────────────────────────────
 *   Athlete:        Md Safkatul Islam (P1, demo athlete)
 *   Camera:         USB2.0 FHD UVC WebCam, ~2.0 m, near-frontal angle
 *   Lighting:       Indoor, light wall background, even lighting
 *   Trials:         3 sets — 9/9, 7/7, 10/10 (100% accuracy)
 *   Form score live: 89% (avg 80% across the set)
 *   Verified:       2026-04-25, BroncoHacks demo build
 *
 * The defaults below (BOTTOM 110°, STAND 160°, MIN_FRAMES 3) are demo-locked
 * for the above athlete and setup. If swapping the demo athlete or moving
 * to a different room, re-run the calibration protocol in plan §7.
 */

/**
 * MediaPipe Pose landmark index map. Subset we actually use.
 * Full list: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
export const L = {
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
  L_FOOT: 31,
  R_FOOT: 32,
} as const;

/**
 * Squat rep detection thresholds.
 *
 * Knee angle convention: 180 deg = fully extended (standing), smaller = bent.
 *  - STAND_ANGLE_DEG: above this, we consider the lifter "standing".
 *  - BOTTOM_ANGLE_DEG: below this, we consider the lifter at squat bottom.
 *  - MIN_FRAMES_FOR_TRANSITION: jitter dampening — require this many
 *    consecutive frames meeting the condition before transitioning.
 *  - MIN_VISIBILITY: per-landmark visibility gate; if any leg landmark drops
 *    below this we skip the frame entirely.
 *  - MIN/MAX_REP_DURATION_MS: reject reps that are absurdly fast/slow as
 *    likely false positives (camera glitch, lifter walking off, etc.).
 */
export const SQUAT = {
  STAND_ANGLE_DEG: 160,
  BOTTOM_ANGLE_DEG: 110,
  MIN_FRAMES_FOR_TRANSITION: 3,
  MIN_VISIBILITY: 0.5,
  MIN_REP_DURATION_MS: 600,
  MAX_REP_DURATION_MS: 6000,
} as const;

/**
 * MediaPipe pose connections we draw for the skeleton overlay.
 * Same set the SkeletonOverlay component already uses — moved here so that
 * downstream consumers can import a single source of truth.
 */
export const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // Arms + shoulders
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  // Torso
  [11, 23],
  [12, 24],
  [23, 24],
  // Left leg
  [23, 25],
  [25, 27],
  [27, 31],
  // Right leg
  [24, 26],
  [26, 28],
  [28, 32],
] as const;

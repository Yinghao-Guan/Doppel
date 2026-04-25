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
 *   Athlete:        TBD (record name + height when calibrating)
 *   Camera distance: ~2.0 m, side-on (phone at hip height)
 *   Lighting:        Natural daylight, no direct backlight
 *   Trial counts:    >=3 sets of 5 squats, indoor practice room
 *
 * Update STAND_ANGLE_DEG / BOTTOM_ANGLE_DEG after recording trials with the
 * actual demo athlete. Numbers below are tuned for an intermediate lifter
 * with a moderate squat depth (about parallel).
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

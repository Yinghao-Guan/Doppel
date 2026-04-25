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

export const SQUAT = {
  STAND_ANGLE_DEG: 160,
  BOTTOM_ANGLE_DEG: 110,
  MIN_FRAMES_FOR_TRANSITION: 3,
  MIN_VISIBILITY: 0.5,
  MIN_REP_DURATION_MS: 600,
  MAX_REP_DURATION_MS: 6000,
} as const;

export const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 31],
  [24, 26],
  [26, 28],
  [28, 32],
] as const;

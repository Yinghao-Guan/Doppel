/**
 * PERSON 1 — pose-internal types.
 *
 * These types live close to the analyzer because they describe the shape of
 * raw MediaPipe output. The cross-team contract lives in `types/index.ts`;
 * do NOT promote anything from this file there without team agreement.
 */

/**
 * One MediaPipe pose landmark in normalized image coordinates.
 *  - x, y are in [0, 1] (image-space, top-left origin).
 *  - z is depth from the camera (model dependent), optional.
 *  - visibility: 0..1 confidence the landmark is in-frame.
 *  - presence:   0..1 confidence the landmark exists at all.
 */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

/** Tiny class-name combiner. No external deps. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Round to a fixed number of decimals. */
export function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Format a signed percentage like "+9.1%" / "-2.3%". */
export function fmtSignedPct(n: number, decimals = 1): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${round(n, decimals)}%`;
}

"use client";

function tintFor(score: number) {
  if (score >= 0.7) return "var(--success)";
  if (score >= 0.5) return "var(--warn)";
  return "var(--danger)";
}

export function FormPill({ liveFormScore }: { liveFormScore: number | null }) {
  if (liveFormScore == null) return null;
  const color = tintFor(liveFormScore);
  return (
    <span
      className="animate-pulse rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.2em]"
      style={{
        borderColor: `${color}66`,
        background: `${color}22`,
        color,
      }}
    >
      Form {Math.round(liveFormScore * 100)}%
    </span>
  );
}

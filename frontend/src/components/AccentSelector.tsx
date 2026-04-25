"use client";

import { ACCENTS } from "@/lib/accents";
import { useAccent } from "./AccentProvider";

export function AccentSelector() {
  const { accent, setAccentId } = useAccent();

  return (
    <div className="glass inline-flex items-center gap-2 rounded-full px-2.5 py-2">
      <span className="ml-1 mr-0.5 hidden font-mono text-[9px] tracking-[0.32em] text-[var(--fg-mute)] sm:inline">
        ACCENT
      </span>
      {ACCENTS.map((a) => {
        const active = a.id === accent.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => setAccentId(a.id)}
            aria-label={`Set accent to ${a.label}`}
            aria-pressed={active}
            className="accent-dot"
            style={
              {
                background: `linear-gradient(135deg, ${a.accentCyan} 0%, ${a.accent} 55%, ${a.accentDeep} 100%)`,
                "--ring": a.accent,
                transform: active ? "scale(1.18)" : undefined,
                boxShadow: active
                  ? `0 0 0 1.5px var(--bg), 0 0 0 3px ${a.accent}, 0 0 14px ${a.accent}`
                  : `inset 0 0 0 1px rgba(255,255,255,0.18)`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

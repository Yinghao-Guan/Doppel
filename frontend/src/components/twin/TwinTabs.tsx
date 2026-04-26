"use client";

import { Activity, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export type TwinMode = "now" | "whatif";

const TABS: { id: TwinMode; label: string; icon: typeof Activity }[] = [
  { id: "now", label: "Now", icon: Activity },
  { id: "whatif", label: "What if", icon: FlaskConical },
];

export function TwinTabs({
  mode,
  onChange,
}: {
  mode: TwinMode;
  onChange: (m: TwinMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Twin view"
      className="glass inline-flex items-center gap-1 rounded-full p-1"
    >
      {TABS.map((t) => {
        const active = mode === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.22em] transition-colors",
              active
                ? "bg-[var(--accent)] text-[var(--bg)]"
                : "text-[var(--fg-dim)] hover:text-[var(--fg)]",
            )}
          >
            <Icon size={12} strokeWidth={2.2} />
            {t.label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

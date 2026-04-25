"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";

type Props = { items: string[] };

export function RecommendationCards({ items }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".rec-card", {
        opacity: 0,
        y: 18,
        filter: "blur(6px)",
        stagger: 0.08,
        duration: 0.7,
        delay: 0.7,
        ease: "power3.out",
      });
    }, rootRef);
    return () => ctx.revert();
  }, [items]);

  return (
    <div ref={rootRef} className="rd-fade">
      <p className="eyebrow mb-4">Do this next</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((text, i) => (
          <article
            key={i}
            className="rec-card group glass relative cursor-default rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_color-mix(in_srgb,var(--accent)_60%,transparent)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] tracking-wide text-[var(--fg)]"
                style={{
                  background:
                    "linear-gradient(135deg,var(--accent) 0%,var(--accent-deep) 100%)",
                  boxShadow:
                    "0 0 14px color-mix(in srgb,var(--accent) 50%, transparent)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <ArrowRight
                size={14}
                className="text-[var(--fg-mute)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]"
              />
            </div>
            <p className="text-sm leading-relaxed text-[var(--fg)]">{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

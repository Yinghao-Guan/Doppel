"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type Props = { items: string[] };

export function ExplanationList({ items }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".expl-row", {
        opacity: 0,
        x: -12,
        filter: "blur(6px)",
        stagger: 0.08,
        duration: 0.6,
        delay: 0.5,
        ease: "power3.out",
      });
    }, rootRef);
    return () => ctx.revert();
  }, [items]);

  return (
    <div ref={rootRef} className="rd-fade glass rounded-2xl p-6">
      <p className="eyebrow mb-4">Why</p>
      <ul className="space-y-3">
        {items.map((text, i) => (
          <li
            key={i}
            className="expl-row relative pl-4 text-sm leading-relaxed text-[var(--fg-dim)]"
          >
            <span
              className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent)",
              }}
            />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

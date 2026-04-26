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

  // Show only the first explanation as a one-liner, mirroring the Summary
  // card directly above. Keeps the dashboard hierarchy crisp and readable.
  const headline = items[0] ?? "";

  return (
    <div ref={rootRef} className="rd-fade glass-strong rounded-2xl p-7">
      <p className="eyebrow mb-3 text-center">Do this next</p>
      <p className="expl-row font-display text-xl leading-relaxed text-[var(--fg)] sm:text-2xl">
        {headline}
      </p>
    </div>
  );
}

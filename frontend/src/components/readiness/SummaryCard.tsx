"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Props = { summary: string };

export function SummaryCard({ summary }: Props) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown("");
    setDone(false);
    if (!summary) return;

    const proxy = { i: 0 };
    const total = summary.length;
    const tween = gsap.to(proxy, {
      i: total,
      duration: Math.min(2.4, total * 0.022),
      ease: "none",
      delay: 0.3,
      onUpdate: () => {
        const cut = Math.floor(proxy.i);
        setShown(summary.slice(0, cut));
      },
      onComplete: () => {
        setShown(summary);
        setDone(true);
      },
    });

    return () => {
      tween.kill();
    };
  }, [summary]);

  return (
    <div ref={wrapRef} className="rd-fade glass-strong rounded-2xl p-7">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Summary</p>
        <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          DOPPEL · LLM
        </span>
      </div>
      <p className="font-display text-xl leading-relaxed text-[var(--fg)] sm:text-2xl">
        {shown}
        {!done && <span className="typewriter-caret" aria-hidden />}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SummaryAudioButton } from "@/components/twin/SummaryAudioButton";

type Props = { summary: string };

export function SummaryCard({ summary }: Props) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Summary</p>
        <div className="flex items-center gap-3">
          <SummaryAudioButton text={summary} />
          <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
            DOPPEL · MODEL
          </span>
        </div>
      </div>
      <p className="font-display text-xl leading-relaxed text-[var(--fg)] sm:text-2xl">
        {shown}
        {!done && <span className="typewriter-caret" aria-hidden />}
      </p>
    </div>
  );
}

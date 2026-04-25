"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { animate, stagger } from "animejs";
import { ArrowRight, Play } from "lucide-react";

export function HeroOverlay() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.8 },
      });
      tl.to(".reveal-eyebrow", {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.6,
      })
        .to(
          ".reveal-headline > span",
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            stagger: 0.04,
            duration: 0.7,
          },
          "-=0.3",
        )
        .to(
          ".reveal-sub",
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7 },
          "-=0.4",
        )
        .to(
          ".reveal-cta",
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            stagger: 0.08,
            duration: 0.6,
          },
          "-=0.45",
        )
        .to(
          ".reveal-meta",
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7 },
          "-=0.3",
        );
    }, rootRef);

    const meta = rootRef.current.querySelectorAll(".meta-dot");
    const animeInstance = animate(meta, {
      opacity: [{ to: [0.35, 1] }, { to: 0.35 }],
      duration: 1800,
      delay: stagger(220),
      loop: true,
      ease: "inOutSine",
    });

    return () => {
      ctx.revert();
      animeInstance.pause();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative z-10 flex min-h-screen w-full flex-col"
    >
      {/* top nav */}
      <header className="flex items-center justify-between px-8 py-6 md:px-14">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
          <span className="font-mono text-xs tracking-[0.32em] text-[var(--fg)]">
            DOPPEL
          </span>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a className="font-mono text-xs tracking-[0.2em] text-[var(--fg-dim)] hover:text-[var(--fg)] transition-colors" href="#how">
            HOW IT WORKS
          </a>
          <a className="font-mono text-xs tracking-[0.2em] text-[var(--fg-dim)] hover:text-[var(--fg)] transition-colors" href="#stack">
            STACK
          </a>
          <a className="font-mono text-xs tracking-[0.2em] text-[var(--fg-dim)] hover:text-[var(--fg)] transition-colors" href="#team">
            TEAM
          </a>
        </nav>
        <button className="cta glass cta-ghost reveal-cta reveal text-xs font-mono tracking-[0.2em] py-2 px-4">
          BRONCOHACKS&apos;26
        </button>
      </header>

      {/* hero center */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center md:px-12">
        <p className="eyebrow reveal-eyebrow reveal mb-6">
          Digital twin · Athletic performance
        </p>
        <h1
          ref={headlineRef}
          className="headline reveal-headline mx-auto max-w-5xl text-4xl text-[var(--fg)] sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {splitWords(
            "Train smarter by testing your future first.",
          )}
        </h1>
        <p className="reveal-sub reveal mx-auto mt-7 max-w-xl text-base leading-relaxed text-[var(--fg-dim)] md:text-lg">
          Your camera captures how you train today. Your AI twin predicts how
          you&apos;ll perform two weeks from now &mdash; before you train.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <button className="cta cta-primary reveal-cta reveal">
            Start your twin
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>
          <button className="cta glass cta-ghost reveal-cta reveal">
            <Play size={14} strokeWidth={2.2} />
            Watch demo
          </button>
        </div>
      </section>

      {/* footer meta strip */}
      <footer className="flex flex-col items-center justify-between gap-4 px-8 pb-8 md:flex-row md:px-14">
        <div className="reveal-meta reveal flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          <span className="meta-dot h-1.5 w-1.5 rounded-full bg-[var(--success)] inline-block" />
          POSE-CV READY
          <span className="mx-3 h-px w-6 bg-[var(--fg-mute)]/40" />
          <span className="meta-dot h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)] inline-block" />
          14-DAY FORECAST
          <span className="mx-3 h-px w-6 bg-[var(--fg-mute)]/40" />
          <span className="meta-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)] inline-block" />
          LLM COACH
        </div>
        <div className="reveal-meta reveal font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          v0.0.1 · doppel-frontend
        </div>
      </footer>
    </div>
  );
}

function splitWords(text: string) {
  return text.split(" ").map((word, i) => (
    <span
      key={i}
      className="reveal inline-block opacity-0 will-change-transform"
      style={{ transform: "translateY(14px)", filter: "blur(6px)" }}
    >
      {word}
      {i < text.split(" ").length - 1 && " "}
    </span>
  ));
}

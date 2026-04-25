"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ArrowRight, Play } from "lucide-react";
import LogoLoop from "./LogoLoop";

const BUILT_WITH_LOGOS = [
  {
    src: "/logos/broncohackslogo.svg",
    alt: "BroncoHacks",
    title: "BroncoHacks",
    href: "https://broncohacks.com",
  },
  {
    src: "/logos/nextjslogo.svg",
    alt: "Next.js",
    title: "Next.js",
    href: "https://nextjs.org",
  },
  {
    src: "/logos/fastapilogo.svg",
    alt: "FastAPI",
    title: "FastAPI",
    href: "https://fastapi.tiangolo.com",
  },
];

const WORDMARK = ["d", "o", "p", "p", "e", "l"];

export function HeroOverlay() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set(".doppel-letter", {
        opacity: 0,
        y: 80,
        scale: 0.85,
        filter: "blur(20px)",
      });

      const tl = gsap.timeline({
        defaults: { ease: "power4.out" },
      });

      tl.to(".doppel-letter", {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 1.1,
        stagger: 0.07,
      })
        .to(
          ".reveal-tagline > span",
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            stagger: 0.035,
            duration: 0.7,
          },
          "-=0.55",
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
        );

      // Subtle perpetual float on each letter, individually phase-shifted.
      gsap.utils.toArray<HTMLElement>(".doppel-letter").forEach((el, i) => {
        gsap.to(el, {
          y: "+=8",
          duration: 2.4 + i * 0.18,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 1.2 + i * 0.05,
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center md:items-start md:px-16 md:text-left lg:px-24"
    >
      <div className="w-full origin-top md:max-w-[55%] md:origin-left md:scale-125 lg:max-w-[52%]">
        <h1
          className="doppel-mark relative"
          aria-label="doppel"
        >
          {WORDMARK.map((l, i) => (
            <span
              key={i}
              className="doppel-letter"
              data-letter={l}
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              {l}
            </span>
          ))}
        </h1>

        <p
          className="reveal-tagline mt-1 max-w-3xl text-lg font-medium text-[var(--fg)] sm:text-xl md:text-2xl"
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.85)" }}
        >
          {splitWords("Train smarter by testing your future first.")}
        </p>

        <p
          className="reveal-sub reveal mt-4 max-w-md text-sm leading-relaxed text-[var(--fg)]/90 md:text-base"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}
        >
          Real-time pose CV plus a predictive twin that shows how you&apos;ll
          perform 14 days from now &mdash; before you train.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 md:items-start md:justify-start">
          <Link href="/capture" className="cta cta-primary reveal-cta reveal">
            Start your twin
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
          <Link href="/dashboard" className="cta glass cta-ghost reveal-cta reveal">
            <Play size={14} strokeWidth={2.2} />
            See the demo
          </Link>
        </div>

        <div
          className="reveal-cta reveal mt-10 w-full max-w-md"
          aria-label="Built at BroncoHacks with Next.js and FastAPI"
        >
          <p
            className="mb-3 text-center text-[11px] uppercase tracking-[0.22em] text-[var(--fg)]/55 md:text-left"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            Built at BroncoHacks
          </p>
          <LogoLoop
            logos={BUILT_WITH_LOGOS}
            speed={50}
            gap={40}
            logoHeight={36}
            pauseOnHover
            scaleOnHover
            fadeOut
            fadeOutColor="#09090b"
            ariaLabel="Built with"
          />
        </div>
      </div>
    </div>
  );
}

function splitWords(text: string) {
  const words = text.split(" ");
  return words.map((word, i) => (
    <Fragment key={i}>
      <span
        className="inline-block opacity-0 will-change-transform"
        style={{ transform: "translateY(12px)", filter: "blur(6px)" }}
      >
        {word}
      </span>
      {i < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

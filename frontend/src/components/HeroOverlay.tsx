"use client";

import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import LogoLoop from "./LogoLoop";
import { setLandingStep } from "@/lib/landing-step";

// useLayoutEffect runs synchronously before browser paint, which is what we
// need so the GSAP intro setup beats the first paint and avoids any FOUC.
// useEffect on the server prevents the React SSR warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const BUILT_WITH_LOGOS = [
  {
    src: "/logos/broncohackslogo.svg",
    alt: "BroncoHacks",
    title: "BroncoHacks",
    href: "https://broncohacks.org/",
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

// Module-level flag: persists across React remounts (e.g. dev Fast Refresh)
// so the intro animation only plays once per real page load.
let introHasPlayed = false;

export function HeroOverlay({ onStart }: { onStart?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isLeavingRef = useRef(false);

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    if (!onStart) return;

    // Kick the canvas FX transition off NOW (camera dolly, bloom fade,
    // vignette fade, terrain dim — all 1.4s). If we wait until the hero
    // fade-out completes, the bg stays at its bright landing state for the
    // full 0.3s of the fade-out and only starts changing after the capture
    // content has appeared, which reads as a "snap" from bright -> tinted.
    // Triggering setLandingStep here lets the bg tween run in parallel with
    // the hero fade-out so the bg is already mid-shift by the time capture
    // content is visible. The setLandingStep("app") that LandingShell's
    // [step] useEffect fires later is a no-op (dedup'd by setLandingStep).
    setLandingStep("app");

    const main =
      typeof document !== "undefined" ? document.querySelector("main") : null;
    if (!main) {
      onStart();
      return;
    }
    gsap.to(main, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => onStart(),
    });
  };

  useIsoLayoutEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      if (!introHasPlayed) {
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
          // Tween the blur away, then strip the inline filter so the CSS
          // `drop-shadow(...)` glow on `.doppel-letter` becomes visible again.
          // (Only `.doppel-letter` has a CSS filter we want to keep — the
          // `.reveal` class's `filter: blur(6px)` is the *hidden* state, so
          // clearProps would re-blur those elements.)
          filter: "blur(0px)",
          duration: 1.1,
          stagger: 0.07,
          clearProps: "filter",
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

        introHasPlayed = true;
      } else {
        // Skip the reveal — jump elements straight to their final visible
        // state. For `.doppel-letter`, leave `filter` alone so the CSS
        // drop-shadow glow stays applied. For `.reveal*`, we MUST set
        // `filter: blur(0px)` inline because the `.reveal` CSS class still
        // applies `filter: blur(6px)` in its resting state — leaving it
        // unset would render the elements blurry.
        gsap.set(".doppel-letter", { opacity: 1, y: 0, scale: 1 });
        gsap.set(".reveal-tagline > span", {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        });
        gsap.set(".reveal-sub", { opacity: 1, y: 0, filter: "blur(0px)" });
        gsap.set(".reveal-cta", { opacity: 1, y: 0, filter: "blur(0px)" });
      }

      // Subtle perpetual float on each letter. We start with a smooth settle
      // from the intro's resting y=0 down to y=-4, *then* loop between
      // y=-4 and y=4. This avoids the 4px snap that the old fromTo created
      // the moment the intro finished.
      gsap.utils.toArray<HTMLElement>(".doppel-letter").forEach((el, i) => {
        const tl = gsap.timeline({
          delay: introHasPlayed ? 0 : 1.2 + i * 0.05,
          defaults: { ease: "sine.inOut" },
        });
        tl.to(el, { y: -4, duration: 1.2 + i * 0.09 }).to(el, {
          y: 4,
          duration: 2.4 + i * 0.18,
          repeat: -1,
          yoyo: true,
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
      <div className="w-full md:max-w-[55%] lg:max-w-[52%]">
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
          className="reveal-tagline mt-6 max-w-3xl text-xl font-medium text-[var(--fg)] sm:text-2xl md:text-3xl"
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.85)" }}
        >
          {splitWords("Train smarter by testing your future first.")}
        </p>

        <p
          className="reveal-sub reveal mt-5 max-w-md text-base leading-relaxed text-[var(--fg)]/90 md:text-lg"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}
        >
          Real-time pose CV plus a predictive twin that shows how you&apos;ll
          perform 14 days from now &mdash; before you train.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 md:items-start md:justify-start">
          <button
            type="button"
            onClick={handleStart}
            className="cta cta-primary reveal-cta reveal"
          >
            Start your twin
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>
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

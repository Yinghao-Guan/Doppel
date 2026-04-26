"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TopNav } from "@/components/TopNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!introRef.current) return;
    // The previous route faded <main> out for the transition — restore it
    // before running the destination intro, otherwise everything stays hidden.
    const main = document.querySelector("main");
    if (main) gsap.set(main, { opacity: 1 });
    const ctx = gsap.context(() => {
      gsap.fromTo(
        introRef.current,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
        },
      );
    }, introRef);
    return () => ctx.revert();
  }, []);

  return (
    <main className="relative noise min-h-screen overflow-hidden flex flex-col">
      <TopNav />
      <div
        ref={introRef}
        className="relative z-10 flex-1 px-6 pb-16 pt-4 md:px-14"
      >
        {children}
      </div>
    </main>
  );
}

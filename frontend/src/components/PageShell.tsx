"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TopNav } from "@/components/TopNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!introRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        introRef.current,
        { opacity: 0, y: 16, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
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

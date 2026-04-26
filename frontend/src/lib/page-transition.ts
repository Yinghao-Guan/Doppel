"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

// Fades + blurs <main> before pushing the next route. Pairs with PageShell's
// intro animation on the destination page so navigating between app pages
// feels like a forward dolly through fog instead of a hard cut.
export function useTransitionNavigate() {
  const router = useRouter();
  const leavingRef = useRef(false);

  return useCallback(
    (href: string) => {
      if (leavingRef.current) return;
      leavingRef.current = true;

      const main =
        typeof document !== "undefined" ? document.querySelector("main") : null;

      const finish = () => {
        router.push(href);
        window.setTimeout(() => {
          leavingRef.current = false;
        }, 200);
      };

      if (!main) {
        finish();
        return;
      }

      gsap.to(main, {
        opacity: 0,
        filter: "blur(6px)",
        duration: 0.35,
        ease: "power2.in",
        onComplete: finish,
      });
    },
    [router],
  );
}

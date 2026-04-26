"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

// Fades <main> before pushing the next route. Pairs with PageShell's intro
// animation on the destination page so navigating between app pages feels
// like one continuous move instead of a hard cut. Avoids CSS `filter: blur`
// because compositing it on top of the live WebGL canvas is what produced
// the heavy/jittery feel.
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
        duration: 0.3,
        ease: "power2.in",
        onComplete: finish,
      });
    },
    [router],
  );
}

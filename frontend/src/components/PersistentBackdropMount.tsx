"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PersistentBackdrop = dynamic(
  () =>
    import("@/components/PersistentBackdrop").then(
      (m) => m.PersistentBackdrop,
    ),
  { ssr: false },
);

export default function PersistentBackdropMount() {
  // Defer the canvas mount by one frame so the GSAP intro starts on the same
  // frame as first paint instead of competing with WebGL boot. The body bg is
  // #09090b (matches the canvas clear color), so a single frame of solid bg
  // is visually identical to a single frame of the canvas's first clear.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) return null;
  return <PersistentBackdrop />;
}

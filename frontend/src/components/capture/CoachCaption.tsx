"use client";

/**
 * On-screen caption bubble for the live coach.
 *
 * Mirrors `voice-store.currentText`. Fades in when a new line lands,
 * stays visible while audio plays, then fades out 1.5s after playback
 * ends so the user has time to read short cues like "Go deeper."
 *
 * Visible even when the user is muted — the text is its own value (and
 * makes the demo readable in a noisy room).
 */
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { useVoiceStore } from "@/lib/voice-store";

const FADE_OUT_DELAY_MS = 1500;
const FADE_OUT_DURATION_MS = 300;

export function CoachCaption() {
  const currentText = useVoiceStore((s) => s.currentText);
  const isPlaying = useVoiceStore((s) => s.isPlaying);
  const setCurrentText = useVoiceStore((s) => s.setCurrentText);

  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState<string | null>(null);

  // New text arrives → swap in + fade in.
  useEffect(() => {
    if (currentText) {
      setDisplayText(currentText);
      // Two-frame delay so opacity transition fires reliably on first render.
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [currentText]);

  // Once playback ends, hold the line briefly then fade out.
  useEffect(() => {
    if (currentText && !isPlaying) {
      const fadeOutTimer = setTimeout(() => setVisible(false), FADE_OUT_DELAY_MS);
      const clearTimer = setTimeout(() => {
        setDisplayText(null);
        setCurrentText(null);
      }, FADE_OUT_DELAY_MS + FADE_OUT_DURATION_MS);
      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [currentText, isPlaying, setCurrentText]);

  if (!displayText) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center"
    >
      <div
        className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-black/70 px-4 py-2 backdrop-blur-md transition-opacity"
        style={{
          opacity: visible ? 1 : 0,
          transitionDuration: `${FADE_OUT_DURATION_MS}ms`,
        }}
      >
        <Volume2
          size={14}
          strokeWidth={2}
          className="text-[var(--accent)]"
          style={{ filter: "drop-shadow(0 0 6px var(--accent))" }}
        />
        <span className="font-display text-sm font-medium tracking-wide text-white">
          {displayText}
        </span>
      </div>
    </div>
  );
}

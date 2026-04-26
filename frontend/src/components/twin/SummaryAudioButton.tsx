"use client";

/**
 * Play/pause button for the Twin summary.
 *
 * Self-contained Audio element so pause/resume works independently from
 * the live-cue audio path in voice-client (which creates fresh Audio
 * elements per cue and can't be paused/resumed).
 *
 * Lazily synthesizes the first time the user clicks. Subsequent clicks
 * toggle play/pause on the cached Blob (instant). Auto-resets to "play"
 * state when audio ends.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2, Volume2 } from "lucide-react";
import { synthesize } from "@/lib/voice-client";
import { useVoiceStore } from "@/lib/voice-store";

type State = "idle" | "loading" | "playing" | "paused" | "error";

interface Props {
  text: string;
  /** When true, kick off synthesis as soon as `text` arrives so click is instant. */
  prefetch?: boolean;
}

export function SummaryAudioButton({ text, prefetch = true }: Props) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const enabled = useVoiceStore((s) => s.enabled);
  const muted = useVoiceStore((s) => s.muted);

  // Eagerly fetch the audio so the first click is instant.
  useEffect(() => {
    if (!prefetch || !text || !enabled) return;
    let cancelled = false;
    void synthesize(text).then((blob) => {
      if (cancelled || !blob) return;
      // Audio is created lazily on first play (so we don't hold a URL
      // that nobody listens to). Just warming the cache here.
    });
    return () => {
      cancelled = true;
    };
  }, [text, prefetch, enabled]);

  // Reset when text changes — old audio is no longer relevant.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [text]);

  const ensureAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    if (audioRef.current) return audioRef.current;
    setState("loading");
    const blob = await synthesize(text);
    if (!blob) {
      setState("error");
      return null;
    }
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const audio = new Audio(url);
    audio.addEventListener("ended", () => setState("idle"));
    audio.addEventListener("error", () => setState("error"));
    audio.addEventListener("pause", () => {
      // pause fires on `ended` too — only flip to paused if audio still has time left.
      if (audio.currentTime < audio.duration) setState("paused");
    });
    audioRef.current = audio;
    return audio;
  }, [text]);

  const handleClick = useCallback(async () => {
    if (state === "loading" || muted || !enabled) return;

    if (state === "playing") {
      audioRef.current?.pause();
      return;
    }

    const audio = await ensureAudio();
    if (!audio) return;

    setState("playing");
    try {
      await audio.play();
    } catch {
      setState("error");
    }
  }, [state, ensureAudio, muted, enabled]);

  const disabled = !enabled || muted || !text;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={
        state === "playing" ? "Pause summary audio" : "Play summary audio"
      }
      className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--surface)]/60 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-[var(--fg-dim)] transition-colors hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {state === "loading" ? (
        <Loader2 size={12} className="animate-spin" />
      ) : state === "playing" ? (
        <Pause size={12} className="text-[var(--accent)]" />
      ) : state === "error" ? (
        <Volume2 size={12} className="text-[var(--danger)]" />
      ) : (
        <Play size={12} />
      )}
      <span>
        {state === "loading"
          ? "LOADING"
          : state === "playing"
            ? "PAUSE"
            : state === "paused"
              ? "RESUME"
              : state === "error"
                ? "VOICE OFF"
                : "LISTEN"}
      </span>
    </button>
  );
}

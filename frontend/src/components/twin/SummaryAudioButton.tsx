"use client";

/**
 * Play/pause button for the Twin summary.
 *
 * Self-contained Audio element so pause/resume works independently from
 * the live-cue audio path in voice-client (which creates fresh Audio
 * elements per cue and can't be paused/resumed).
 *
 * Behavior:
 * - Lazy synthesis on text arrival so the first click is instant.
 * - Click toggles play/pause on the cached Blob.
 * - Auto-plays ONCE per new fingerprint: when the user finishes a set
 *   and lands on Twin, the summary speaks itself. Re-rendering or
 *   re-navigating to Twin without a new set stays silent.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2, Volume2 } from "lucide-react";
import { synthesize } from "@/lib/voice-client";
import { useVoiceStore } from "@/lib/voice-store";
import { useAthleteStore } from "@/lib/athlete-store";
import { useTwinAudioStore } from "@/lib/twin-audio-store";

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
  const fingerprintTs = useAthleteStore(
    (s) => s.fingerprint?.timestamp ?? null,
  );
  const lastAutoPlayedTs = useTwinAudioStore(
    (s) => s.lastAutoPlayedTimestamp,
  );
  const markAutoPlayed = useTwinAudioStore((s) => s.markAutoPlayed);

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

  // First-time auto-play: when a brand-new fingerprint lands and we haven't
  // already auto-played for this timestamp, fire once. Re-renders / repeat
  // navigation without a new set stay silent (the timestamp comparison gates
  // it). Marking happens after the play() promise resolves either way so a
  // blocked autoplay doesn't retry on every render.
  useEffect(() => {
    if (!fingerprintTs || !text || !enabled || muted) return;
    if (fingerprintTs === lastAutoPlayedTs) return;

    let cancelled = false;
    void (async () => {
      const audio = await ensureAudio();
      if (cancelled || !audio) {
        if (!cancelled) markAutoPlayed(fingerprintTs);
        return;
      }
      setState("playing");
      try {
        await audio.play();
      } catch (err) {
        console.warn("[summary-audio] autoplay rejected", err);
        setState("idle");
      } finally {
        if (!cancelled) markAutoPlayed(fingerprintTs);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fingerprintTs,
    lastAutoPlayedTs,
    text,
    enabled,
    muted,
    ensureAudio,
    markAutoPlayed,
  ]);

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

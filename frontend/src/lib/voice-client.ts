/**
 * Browser-side ElevenLabs client.
 *
 * Responsibilities:
 *   1. Call our `/api/voice` endpoint, get back an audio/mpeg Blob.
 *   2. Cache Blobs in memory keyed by exact text (so repeats are instant).
 *   3. Play through a single shared HTMLAudioElement so cues never overlap.
 *   4. Mirror playback state into voice-store for the UI to subscribe to.
 *
 * Failure mode: if synthesis fails (no key, network down, rate limit),
 * we log a warning and resolve null. Callers must treat null as "voice
 * unavailable" — never crash the capture flow because of audio.
 */

import { readVoiceState, useVoiceStore } from "./voice-store";

const CACHE = new Map<string, Blob>();
let currentAudio: HTMLAudioElement | null = null;
let inflightSynth = new Map<string, Promise<Blob | null>>();

/** Stable key — identical text + voice produces identical audio, so cache hits. */
function cacheKey(text: string, voiceId?: string): string {
  return voiceId ? `${voiceId}::${text}` : text;
}

/**
 * Fetch (or hit cache for) a synthesized Blob. Returns null on any failure.
 * Concurrent calls for the same text de-dupe through `inflightSynth`.
 */
export async function synthesize(
  text: string,
  voiceId?: string,
): Promise<Blob | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const key = cacheKey(trimmed, voiceId);
  const cached = CACHE.get(key);
  if (cached) return cached;

  const inflight = inflightSynth.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmed, voiceId }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.warn("[voice-client] synthesize failed", res.status, errBody);
        return null;
      }
      const blob = await res.blob();
      CACHE.set(key, blob);
      return blob;
    } catch (err) {
      console.warn("[voice-client] synthesize threw", err);
      return null;
    } finally {
      inflightSynth.delete(key);
    }
  })();

  inflightSynth.set(key, promise);
  return promise;
}

/**
 * Play a Blob through the shared Audio element.
 * Cancels any current playback first so cues never overlap.
 */
export function play(blob: Blob, text?: string): Promise<void> {
  // Stop & release the previous audio (and its blob URL) before starting a new one.
  stop();

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  const store = useVoiceStore;

  audio.addEventListener("play", () => {
    store.getState().setPlaying(true);
    if (text) store.getState().setCurrentText(text);
  });

  const finish = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
    store.getState().setPlaying(false);
    // Keep currentText for a moment so the caption can fade out gracefully —
    // PoseCamera/CoachCaption handle the timed clear.
  };
  audio.addEventListener("ended", finish);
  audio.addEventListener("error", finish);

  return audio.play().catch((err) => {
    // Autoplay-policy rejection or user-initiated cancellation.
    console.warn("[voice-client] play() rejected", err);
    finish();
  });
}

/**
 * Synthesize then play. Most callers want this single call.
 * Skips silently when voice is disabled / muted.
 */
export async function synthesizeAndPlay(
  text: string,
  voiceId?: string,
): Promise<void> {
  const state = readVoiceState();
  if (!state.enabled || state.muted) {
    // Still update currentText so the caption can flash even when muted.
    if (state.muted) useVoiceStore.getState().setCurrentText(text);
    return;
  }
  const blob = await synthesize(text, voiceId);
  if (!blob) return;
  await play(blob, text);
}

/**
 * Pre-warm the cache for an array of cues. Fire-and-forget; failures are
 * logged but don't reject. Use this on Start Set so the first few live
 * cues during a set play instantly.
 */
export function prefetch(texts: string[], voiceId?: string): void {
  for (const t of texts) {
    void synthesize(t, voiceId);
  }
}

/** Stop whatever is playing right now. Safe to call when nothing is playing. */
export function stop(): void {
  const audio = currentAudio;
  currentAudio = null;
  if (audio) {
    try {
      audio.pause();
      audio.src = "";
    } catch {
      /* ignore */
    }
  }
  useVoiceStore.getState().setPlaying(false);
}

/** For tests / hot reload. Drops cached audio and resets store. */
export function _reset(): void {
  stop();
  CACHE.clear();
  inflightSynth.clear();
  useVoiceStore.getState().reset();
}

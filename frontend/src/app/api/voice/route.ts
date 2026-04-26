/**
 * POST /api/voice
 *
 * ElevenLabs streaming TTS proxy. Server-side only — keeps the API key
 * out of the browser.
 *
 * Body:    { text: string, voiceId?: string }
 * Returns: audio/mpeg stream (the synthesized voice)
 *
 * Notes:
 * - Uses `eleven_turbo_v2_5` for low latency (~300ms first byte).
 * - `voice_settings.stability: 0.5` keeps delivery natural without
 *   over-flat affect.
 * - If ELEVENLABS_API_KEY is not set we 500 with a clear message; the
 *   client should treat this as "voice unavailable" and continue silently.
 */
import { NextResponse } from "next/server";

export const runtime = "edge";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const ELEVENLABS_ENDPOINT = (voiceId: string) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

interface VoiceRequest {
  text: string;
  voiceId?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY missing" },
      { status: 500 },
    );
  }

  let body: VoiceRequest;
  try {
    body = (await req.json()) as VoiceRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "`text` is required" },
      { status: 400 },
    );
  }

  const voiceId =
    body.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  let upstream: Response;
  try {
    upstream = await fetch(ELEVENLABS_ENDPOINT(voiceId), {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Upstream fetch failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "<no body>");
    return NextResponse.json(
      { error: `ElevenLabs ${upstream.status}`, detail },
      { status: 502 },
    );
  }

  // Stream the audio bytes straight through to the browser.
  return new Response(upstream.body, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
    },
  });
}

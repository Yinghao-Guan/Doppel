/**
 * PERSON 2 — POST /api/voice
 *
 * Streams ElevenLabs audio for the given text.
 * Body: { text: string }
 * Response: audio/mpeg
 */
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text: string };
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  if (!apiKey) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY missing" }, { status: 500 });
  }

  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
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
    }
  );

  if (!r.ok || !r.body) {
    return NextResponse.json({ error: "voice failed" }, { status: 500 });
  }

  return new Response(r.body, {
    headers: { "content-type": "audio/mpeg" },
  });
}

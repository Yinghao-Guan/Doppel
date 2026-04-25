/**
 * PERSON 2 — POST /api/coach
 *
 * Body: { profile, fingerprint, plan, projection }
 * Response: CoachAdvice
 */
import { NextResponse } from "next/server";
import { buildCoachPrompt, callClaude, localFallback } from "@/lib/prediction/coach";
import type {
  Projection,
  TrainingFingerprint,
  TrainingPlan,
  UserProfile,
} from "@/types";

export const runtime = "edge";

interface Body {
  profile: UserProfile;
  fingerprint: TrainingFingerprint;
  plan: TrainingPlan;
  projection: Projection;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const prompt = buildCoachPrompt(
    body.profile,
    body.fingerprint,
    body.plan,
    body.projection
  );

  const llm = await callClaude(prompt);
  if (llm) return NextResponse.json(llm);

  return NextResponse.json(localFallback(body.fingerprint, body.projection));
}

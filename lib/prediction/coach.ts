/**
 * PERSON 2 — LLM coaching layer.
 *
 * Build the prompt, call the model, parse JSON. Replace the API call with
 * whichever provider you have a key for. The default uses Anthropic Claude
 * via fetch (no SDK) so it works in the Next route without extra deps.
 */

import type {
  CoachAdvice,
  Projection,
  TrainingFingerprint,
  TrainingPlan,
  UserProfile,
} from "@/types";

export function buildCoachPrompt(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan,
  projection: Projection
): string {
  return `You are an elite strength coach. Be specific, terse, encouraging.

ATHLETE
- Age ${profile.age}, ${profile.heightCm}cm, ${profile.weightKg}kg
- Level: ${profile.fitnessLevel}, goal: ${profile.goal}
- Trains ${profile.trainingFrequency}x/wk, sleeps ${profile.sleepHours}h

LIVE BIOMECHANICS (this set, ${fp.exercise})
- Reps: ${fp.totalReps}, form score: ${(fp.avgFormScore * 100).toFixed(0)}%
- ROM: ${(fp.avgRangeOfMotion * 100).toFixed(0)}%, tempo consistency: ${(fp.tempoConsistency * 100).toFixed(0)}%
- L/R asymmetry: ${(fp.asymmetryAvg * 100).toFixed(0)}%, fatigue trend: ${fp.fatigueTrend.toFixed(2)}
- Risk markers: ${fp.injuryRiskMarkers.join(", ") || "none"}

PLAN BEING SIMULATED: ${plan.label} (${plan.frequencyPerWeek}x/wk, intensity ${plan.intensity})
PROJECTED 14-DAY OUTCOME
- Strength ${projection.strengthDeltaPct}%, Endurance ${projection.enduranceDeltaPct}%
- Mobility ${projection.mobilityDeltaPct}%, Recovery ${projection.recoveryScore}/100
- Injury risk delta ${projection.injuryRiskDeltaPct}%

Return ONLY this JSON, no prose:
{
  "summary": "<one or two sentences>",
  "recommendations": ["<bullet>", "<bullet>", "<bullet>"],
  "warnings": ["<bullet>"]
}`;
}

/** Heuristic fallback so the demo never shows an empty card. */
export function localFallback(
  fp: TrainingFingerprint,
  projection: Projection
): CoachAdvice {
  const recs: string[] = [];
  if (fp.avgFormScore < 0.7)
    recs.push("Drop weight 10% and prioritize controlled depth — form unlocks the next 4% gain.");
  if (fp.tempoConsistency < 0.6)
    recs.push("Use a 3-1-1 tempo (3s down, 1s pause, 1s up) to stabilize bar path.");
  if (fp.asymmetryAvg > 0.08)
    recs.push("Add unilateral work (Bulgarian splits, single-leg RDLs) to close the L/R gap.");
  if (recs.length === 0)
    recs.push("Add 5% load each week — your form supports progressive overload.");

  const warnings: string[] = [];
  if (projection.injuryRiskDeltaPct > 8)
    warnings.push(`Injury risk trending +${projection.injuryRiskDeltaPct}% — consider a deload week.`);
  if (projection.recoveryScore < 60)
    warnings.push(`Recovery score ${projection.recoveryScore} — sleep is the cheapest gain available.`);

  return {
    summary: `Projected +${projection.strengthDeltaPct}% strength in ${projection.horizonDays} days. Form is your biggest lever.`,
    recommendations: recs,
    warnings,
  };
}

/** Anthropic call — returns parsed JSON or null on failure. */
export async function callClaude(prompt: string): Promise<CoachAdvice | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return null;
    return JSON.parse(json[0]) as CoachAdvice;
  } catch {
    return null;
  }
}

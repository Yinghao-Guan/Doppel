import { NextResponse } from "next/server";
import {
  GeminiAuthError,
  GeminiConnectionError,
  GeminiModelError,
  GeminiResponseError,
  geminiChatJson,
} from "@/lib/gemini";
import {
  GENERATE_PLAN_SCHEMA,
  GENERATE_PLAN_SYSTEM,
  buildGeneratePlanUserMessage,
  findProseDigitViolation,
  ConstraintRejectedError,
} from "@/lib/coach-prompts";
import type {
  GeneratePlanRequest,
  GeneratePlanResponse,
} from "@/lib/coach-types";
import { readJsonBody } from "@/lib/api-guards";

export const runtime = "nodejs";

function validate(body: unknown): GeneratePlanRequest | string {
  if (!body || typeof body !== "object") return "Request body must be a JSON object.";
  const b = body as Partial<GeneratePlanRequest>;
  if (!b.profile || typeof b.profile !== "object") return "Missing 'profile'.";
  if (!b.fingerprint || typeof b.fingerprint !== "object") return "Missing 'fingerprint'.";
  if (!b.goal || typeof b.goal !== "object") return "Missing 'goal'.";
  if (typeof b.goal.target_metric !== "string") return "Missing 'goal.target_metric'.";
  if (typeof b.goal.horizon_days !== "number") return "Missing 'goal.horizon_days'.";
  if (!Array.isArray(b.goal.constraints)) return "Missing 'goal.constraints' (array).";
  return b as GeneratePlanRequest;
}

export async function POST(req: Request) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const validated = validate(parsed.body);
  if (typeof validated === "string") {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const result = await geminiChatJson<GeneratePlanResponse>(
      [
        { role: "system", content: GENERATE_PLAN_SYSTEM },
        { role: "user", content: buildGeneratePlanUserMessage(validated) },
      ],
      GENERATE_PLAN_SCHEMA,
      0.8,
      { model: "gemini-2.5-flash-lite" },
    );

    if (!result?.plans || !Array.isArray(result.plans)) {
      return NextResponse.json(
        { error: "Model output missing 'plans' array." },
        { status: 500 },
      );
    }
    for (const plan of result.plans) {
      const violation = findProseDigitViolation(plan?.rationale);
      if (violation) {
        console.error("generate-plan digit-scrub rejected output:", violation);
        return NextResponse.json(
          { error: "Model produced disallowed numeric content." },
          { status: 502 },
        );
      }
      const mix = plan?.exercise_mix;
      if (mix) {
        const sum = (mix.strength ?? 0) + (mix.cardio ?? 0) + (mix.mobility ?? 0);
        if (sum < 0.95 || sum > 1.05) {
          console.error("generate-plan exercise_mix sum out of range:", sum);
          return NextResponse.json(
            { error: "Model produced an invalid exercise_mix." },
            { status: 502 },
          );
        }
      }
    }
    return NextResponse.json(result satisfies GeneratePlanResponse);
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof ConstraintRejectedError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof GeminiAuthError) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  if (err instanceof GeminiConnectionError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  if (err instanceof GeminiModelError) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  if (err instanceof GeminiResponseError) {
    console.error("Gemini response error:", err.message, err.raw);
    return NextResponse.json({ error: "Upstream model error." }, { status: 502 });
  }
  console.error("Coach generate-plan route error:", err);
  return NextResponse.json({ error: "Internal error." }, { status: 500 });
}

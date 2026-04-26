import { NextResponse } from "next/server";
import {
  GeminiAuthError,
  GeminiConnectionError,
  GeminiModelError,
  GeminiResponseError,
  geminiChatJson,
} from "@/lib/gemini";
import {
  COMPARE_PLANS_SCHEMA,
  COMPARE_PLANS_SYSTEM,
  buildComparePlansUserMessage,
} from "@/lib/coach-prompts";
import type {
  ComparePlansRequest,
  ComparePlansResponse,
} from "@/lib/coach-types";

export const runtime = "nodejs";

function validate(body: unknown): ComparePlansRequest | string {
  if (!body || typeof body !== "object") return "Request body must be a JSON object.";
  const b = body as Partial<ComparePlansRequest>;
  if (!b.goal || typeof b.goal !== "object") return "Missing 'goal'.";
  if (!Array.isArray(b.scored_plans) || b.scored_plans.length < 2) {
    return "Need at least 2 entries in 'scored_plans'.";
  }
  for (let i = 0; i < b.scored_plans.length; i++) {
    const s = b.scored_plans[i];
    if (!s || typeof s !== "object" || !s.plan || !s.predictions) {
      return `scored_plans[${i}] must have 'plan' and 'predictions'.`;
    }
  }
  return b as ComparePlansRequest;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validate(body);
  if (typeof validated === "string") {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const result = await geminiChatJson<ComparePlansResponse>(
      [
        { role: "system", content: COMPARE_PLANS_SYSTEM },
        { role: "user", content: buildComparePlansUserMessage(validated) },
      ],
      COMPARE_PLANS_SCHEMA,
      0.4,
    );

    const c = result?.comparison;
    if (!c) {
      return NextResponse.json(
        { error: "Model output missing 'comparison' object." },
        { status: 500 },
      );
    }
    if (
      typeof c.recommended_plan_index !== "number" ||
      c.recommended_plan_index < 0 ||
      c.recommended_plan_index >= validated.scored_plans.length
    ) {
      return NextResponse.json(
        { error: "Model returned an out-of-range recommended_plan_index." },
        { status: 502 },
      );
    }
    return NextResponse.json(result satisfies ComparePlansResponse);
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
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
    return NextResponse.json(
      { error: err.message, raw: err.raw },
      { status: 502 },
    );
  }
  const message = err instanceof Error ? err.message : "Unknown error.";
  return NextResponse.json({ error: message }, { status: 500 });
}

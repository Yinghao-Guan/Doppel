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
} from "@/lib/coach-prompts";
import type {
  GeneratePlanRequest,
  GeneratePlanResponse,
} from "@/lib/coach-types";

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
    const result = await geminiChatJson<GeneratePlanResponse>(
      [
        { role: "system", content: GENERATE_PLAN_SYSTEM },
        { role: "user", content: buildGeneratePlanUserMessage(validated) },
      ],
      GENERATE_PLAN_SCHEMA,
      0.8,
    );

    if (!result?.plans || !Array.isArray(result.plans)) {
      return NextResponse.json(
        { error: "Model output missing 'plans' array." },
        { status: 500 },
      );
    }
    return NextResponse.json(result satisfies GeneratePlanResponse);
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

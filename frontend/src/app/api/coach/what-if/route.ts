import { NextResponse } from "next/server";
import {
  GeminiAuthError,
  GeminiConnectionError,
  GeminiModelError,
  GeminiResponseError,
  geminiChatJson,
} from "@/lib/gemini";
import {
  WHATIF_SCHEMA,
  WHATIF_SYSTEM,
  buildWhatIfUserMessage,
  findProseDigitViolation,
  ConstraintRejectedError,
} from "@/lib/coach-prompts";
import type { WhatIfRequest, WhatIfResponse } from "@/lib/coach-types";
import { readJsonBody } from "@/lib/api-guards";

export const runtime = "nodejs";

function validate(body: unknown): WhatIfRequest | string {
  if (!body || typeof body !== "object") return "Request body must be a JSON object.";
  const b = body as Partial<WhatIfRequest>;
  if (!b.profile || typeof b.profile !== "object") return "Missing 'profile'.";
  if (!b.fingerprint || typeof b.fingerprint !== "object") return "Missing 'fingerprint'.";
  if (!b.current_plan || typeof b.current_plan !== "object") return "Missing 'current_plan'.";
  if (!b.before_predictions || typeof b.before_predictions !== "object") return "Missing 'before_predictions'.";
  if (!b.after_predictions || typeof b.after_predictions !== "object") return "Missing 'after_predictions'.";
  if (typeof b.change_description !== "string" || b.change_description.trim().length === 0) {
    return "Missing 'change_description' (non-empty string).";
  }
  return b as WhatIfRequest;
}

export async function POST(req: Request) {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const validated = validate(parsed.body);
  if (typeof validated === "string") {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const result = await geminiChatJson<WhatIfResponse>(
      [
        { role: "system", content: WHATIF_SYSTEM },
        { role: "user", content: buildWhatIfUserMessage(validated) },
      ],
      WHATIF_SCHEMA,
      0.4,
    );

    if (!result?.result) {
      return NextResponse.json(
        { error: "Model output missing 'result' object." },
        { status: 500 },
      );
    }
    const violation =
      findProseDigitViolation(result.result.interpretation) ??
      findProseDigitViolation(result.result.key_insight);
    if (violation) {
      console.error("what-if digit-scrub rejected output:", violation);
      return NextResponse.json(
        { error: "Model produced disallowed numeric content." },
        { status: 502 },
      );
    }
    return NextResponse.json(result satisfies WhatIfResponse);
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
  console.error("Coach what-if route error:", err);
  return NextResponse.json({ error: "Internal error." }, { status: 500 });
}

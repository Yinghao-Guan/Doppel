import type {
  ComparePlansRequest,
  ComparePlansResponse,
  GeneratePlanRequest,
  GeneratePlanResponse,
  WhatIfRequest,
  WhatIfResponse,
} from "@/lib/coach-types";

export class CoachClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "CoachClientError";
  }
}

async function postJson<TReq, TRes>(
  path: string,
  body: TReq,
  init?: { signal?: AbortSignal },
): Promise<TRes> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: init?.signal,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
        ? (parsed as { error: string }).error
        : res.statusText;
    throw new CoachClientError(
      `${path} failed (${res.status}): ${detail}`,
      res.status,
      parsed,
    );
  }

  return parsed as TRes;
}

export function generatePlan(
  req: GeneratePlanRequest,
  init?: { signal?: AbortSignal },
): Promise<GeneratePlanResponse> {
  return postJson("/api/coach/generate-plan", req, init);
}

export function whatIf(
  req: WhatIfRequest,
  init?: { signal?: AbortSignal },
): Promise<WhatIfResponse> {
  return postJson("/api/coach/what-if", req, init);
}

export function comparePlans(
  req: ComparePlansRequest,
  init?: { signal?: AbortSignal },
): Promise<ComparePlansResponse> {
  return postJson("/api/coach/compare-plans", req, init);
}

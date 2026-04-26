import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 8 * 1024;

export type ParsedBody<T = unknown> =
  | { ok: true; body: T }
  | { ok: false; response: NextResponse };

/**
 * Validates Content-Type, enforces an 8 KB body cap inside the route handler
 * (Content-Length is unreliable under chunked encoding), and JSON-parses.
 */
export async function readJsonBody<T = unknown>(
  req: Request,
): Promise<ParsedBody<T>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unsupported Media Type" },
        { status: 415 },
      ),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid body" }, { status: 400 }),
    };
  }

  if (text.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Payload too large" },
        { status: 413 },
      ),
    };
  }

  try {
    return { ok: true, body: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      ),
    };
  }
}

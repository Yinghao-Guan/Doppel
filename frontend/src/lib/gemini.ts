type GeminiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GeminiChatOptions = {
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
  signal?: AbortSignal;
};

const DEFAULT_HOST = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-2.5-flash";

function getHost(): string {
  return process.env.GEMINI_HOST?.trim() || DEFAULT_HOST;
}

function getModel(override?: string): string {
  if (override && override.trim().length > 0) return override;
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new GeminiAuthError(
      "GEMINI_API_KEY is not set. Add it to frontend/.env.local. Get a key at https://aistudio.google.com/apikey",
    );
  }
  return key;
}

export class GeminiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiAuthError";
  }
}

export class GeminiConnectionError extends Error {
  constructor(host: string, cause?: unknown) {
    super(`Could not reach Gemini API at ${host}.`);
    this.name = "GeminiConnectionError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

export class GeminiModelError extends Error {
  constructor(model: string, detail: string) {
    super(`Gemini rejected model "${model}": ${detail}.`);
    this.name = "GeminiModelError";
  }
}

export class GeminiResponseError extends Error {
  constructor(message: string, public readonly raw?: string) {
    super(message);
    this.name = "GeminiResponseError";
  }
}

type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
type GeminiBody = {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig: {
    temperature: number;
    responseMimeType?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

function toGeminiBody(
  messages: GeminiMessage[],
  temperature: number,
  jsonMode: boolean,
): GeminiBody {
  const systemTexts: string[] = [];
  const contents: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemTexts.push(m.content);
    } else {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }
  }
  const body: GeminiBody = {
    contents,
    generationConfig: { temperature },
  };
  if (systemTexts.length > 0) {
    body.systemInstruction = { parts: [{ text: systemTexts.join("\n\n") }] };
  }
  if (jsonMode) {
    body.generationConfig.responseMimeType = "application/json";
  }
  return body;
}

async function postGenerate(
  model: string,
  body: GeminiBody,
  signal?: AbortSignal,
): Promise<GeminiResponse> {
  const host = getHost();
  const apiKey = getApiKey();
  const url = `${host.replace(/\/$/, "")}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new GeminiConnectionError(host, err);
  }

  const text = await res.text();
  let data: GeminiResponse | null = null;
  try {
    data = text ? (JSON.parse(text) as GeminiResponse) : null;
  } catch {
    throw new GeminiResponseError(`Gemini returned non-JSON response (HTTP ${res.status}).`, text);
  }

  if (!res.ok || data?.error) {
    const msg = data?.error?.message || `HTTP ${res.status}: ${text || res.statusText}`;
    if (res.status === 404 || /not found|unsupported/i.test(msg)) {
      throw new GeminiModelError(model, msg);
    }
    if (res.status === 401 || res.status === 403) {
      throw new GeminiAuthError(`Gemini auth failed: ${msg}`);
    }
    throw new GeminiResponseError(`Gemini error: ${msg}`, text);
  }

  if (!data) {
    throw new GeminiResponseError("Gemini returned an empty response.");
  }

  if (data.promptFeedback?.blockReason) {
    throw new GeminiResponseError(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
  }

  return data;
}

function extractText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new GeminiResponseError("Gemini response missing candidate text.");
  }
  return parts.map((p) => p.text ?? "").join("");
}

export async function geminiChat(
  messages: GeminiMessage[],
  options: GeminiChatOptions = {},
): Promise<string> {
  const model = getModel(options.model);
  const body = toGeminiBody(messages, options.temperature ?? 0.7, options.jsonMode === true);
  const data = await postGenerate(model, body, options.signal);
  return extractText(data);
}

export async function geminiChatJson<T>(
  messages: GeminiMessage[],
  schema?: Record<string, unknown>,
  temperature: number = 0.4,
  options: { model?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const augmented = schema ? appendSchemaToLastUser(messages, schema) : messages;
  const raw = await geminiChat(augmented, {
    model: options.model,
    temperature,
    jsonMode: true,
    signal: options.signal,
  });

  const trimmed = stripCodeFences(raw).trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch (err) {
    throw new GeminiResponseError(
      `Failed to parse Gemini JSON output: ${(err as Error).message}`,
      raw,
    );
  }
}

function stripCodeFences(text: string): string {
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = text.trim().match(fence);
  return match ? match[1] : text;
}

function appendSchemaToLastUser(
  messages: GeminiMessage[],
  schema: Record<string, unknown>,
): GeminiMessage[] {
  const block = [
    "",
    "Your response MUST be a single JSON object that conforms exactly to this JSON Schema. Match every required key, including the top-level wrapper key. Do not add or omit keys.",
    "```json",
    JSON.stringify(schema, null, 2),
    "```",
  ].join("\n");
  const out = messages.slice();
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].role === "user") {
      out[i] = { ...out[i], content: out[i].content + block };
      return out;
    }
  }
  out.push({ role: "user", content: block.trimStart() });
  return out;
}

export type { GeminiMessage, GeminiChatOptions };

import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://doppel.app",
  "https://staging.doppel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    return u.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' " +
      "https://generativelanguage.googleapis.com " +
      "https://api.devnet.solana.com wss://api.devnet.solana.com " +
      "https://api.mainnet-beta.solana.com wss://api.mainnet-beta.solana.com " +
      "https://storage.googleapis.com " +
      "https://cdn.jsdelivr.net " +
      "https://api.elevenlabs.io",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join("; ");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/coach") || pathname.startsWith("/api/predict")) {
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const checked = origin ?? referer;
    if (checked && !isAllowedOrigin(checked)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Content-Security-Policy-Report-Only", buildCsp(nonce));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";

// ══════════════════════════════════════════
// MishMesh.ai — Production Middleware
//
// 1. Security headers (CSP, HSTS, XSS, clickjacking)
// 2. CORS for public API routes
// 3. Rate limiting (lightweight, per-IP)
// 4. Request logging
// ══════════════════════════════════════════

// In-memory rate limiter (per worker process)
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

// Clean stale buckets every 2 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of ipBuckets) {
      if (v.resetAt < now) ipBuckets.delete(k);
    }
  }, 120_000);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "unknown";

  // ═══ 0. AUTH-BASED ROUTING ═══
  const hasSession = req.cookies.get("mm-session");

  // Unauthenticated users hitting "/" → serve landing.html (no React overhead)
  if (pathname === "/") {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/landing.html";
      return NextResponse.rewrite(url);
    }
    // Authenticated users hitting "/" → redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated users hitting protected pages → redirect to signin
  const protectedPaths = ["/dashboard", "/marketplace", "/leaderboard", "/explore"];
  if (!hasSession && protectedPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // Authenticated users hitting signin → redirect to dashboard
  if (hasSession && pathname === "/auth/signin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ═══ 1. GLOBAL RATE LIMIT ═══
  // API routes: 120 req/min per IP
  if (pathname.startsWith("/api/")) {
    const isAllowed = rateLimit(`api:${ip}`, 120, 60_000);
    if (!isAllowed) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // Stricter limit for auth endpoints: 10/min
    if (pathname.startsWith("/api/auth/")) {
      if (!rateLimit(`auth:${ip}`, 10, 60_000)) {
        return new NextResponse(JSON.stringify({ error: "Too many auth attempts" }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
    }

    // Trade rate limit: 20/min (prevent bot spam on bonding curves)
    if (pathname.startsWith("/api/tokens")) {
      if (!rateLimit(`trade:${ip}`, 20, 60_000)) {
        return new NextResponse(JSON.stringify({ error: "Too many requests. Slow down." }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "30" },
        });
      }
    }
  }

  // ═══ 2. CORS (public marketplace + token APIs) ═══
  const origin = req.headers.get("origin") || "";
  const res = NextResponse.next();

  if (pathname.startsWith("/api/tokens") || pathname.startsWith("/marketplace")) {
    const allowedOrigins = [
      "https://mishmesh.ai",
      "https://www.mishmesh.ai",
      "http://localhost:3000",
    ];
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
      res.headers.set("Access-Control-Allow-Origin", origin || "*");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.headers.set("Access-Control-Max-Age", "86400");
    }
  }

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  // ═══ 3. SECURITY HEADERS ═══
  const isProd = process.env.NODE_ENV === "production";

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://mainnet.base.org https://api.dexscreener.com https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org https://*.web3modal.org https://*.web3modal.com https://pulse.walletconnect.org https://rpc.ankr.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.groq.com https://openrouter.ai",
    "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.org https://*.web3modal.com",
    "frame-ancestors 'self'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // ═══ 4. REQUEST ID (for tracing) ═══
  const requestId = crypto.randomUUID();
  res.headers.set("X-Request-Id", requestId);

  return res;
}

export const config = {
  matcher: [
    // Run on all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

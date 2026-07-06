import { NextRequest, NextResponse } from "next/server";

// ══════════════════════════════════════════
// BLINK — Production Middleware
//
// 1. Security headers (CSP, HSTS, XSS, clickjacking)
// 2. CORS for public API routes
// 3. Rate limiting (lightweight, per-IP)
// 4. Request logging
// ══════════════════════════════════════════

// ═══ MARKETING-ONLY MODE (App Review) ═══
// When NEXT_PUBLIC_MARKETING_ONLY=true, the site is locked down to the
// marketing surface: landing page, legal pages, support, and the public
// share pages (/u/<username>, /b/<code>). Everything else 302s to /.
// Flip the env var off and the whole app comes back — no code removed.
const MARKETING_ONLY = process.env.NEXT_PUBLIC_MARKETING_ONLY === "true";

const MARKETING_ALLOWED_EXACT = ["/", "/privacy", "/terms", "/support"];
const MARKETING_ALLOWED_PREFIXES = [
  "/u/", // public trainer cards
  "/b/", // battle-invite fallback pages
  "/floating/", // creature image bridge used by /u cards
  "/.well-known/", // apple-app-site-association (universal links)
  "/api/waitlist", // landing-page waitlist form
  "/api/health",
];

function isMarketingAllowed(pathname: string): boolean {
  if (MARKETING_ALLOWED_EXACT.includes(pathname)) return true;
  if (MARKETING_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Static assets (anything with a file extension): /brand/*.png,
  // /og-image.jpg, /manifest.json, /sitemap.xml, /robots.txt, …
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true;
  return false;
}

// robots.txt in /public mentions app-only paths; serve a minimal one instead
// while marketing-only mode is on.
const MARKETING_ROBOTS = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://blinkworld.xyz/sitemap.xml
`;

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

  // ═══ MARKETING-ONLY GATE ═══
  if (MARKETING_ONLY) {
    if (pathname === "/robots.txt") {
      return new NextResponse(MARKETING_ROBOTS, {
        headers: { "Content-Type": "text/plain" },
      });
    }
    if (!isMarketingAllowed(pathname)) {
      return NextResponse.redirect(new URL("/", req.url), 302);
    }
  }

  // ═══ 0. AUTH-BASED ROUTING ═══
  // Check for Supabase auth cookies (sb-<ref>-auth-token or sb-<ref>-auth-token-code-verifier)
  const hasSession = Array.from(req.cookies.getAll()).some(c => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  // "/" → always serve the Next.js page.tsx (landing.html was removed)
  // page.tsx handles both logged-in and logged-out states internally

  // Unauthenticated users hitting protected pages → redirect to signin
  // Note: /wallet, /messages, /profile handle their own auth checks client-side
  // (Supabase sessions live in localStorage, not cookies, so middleware can't see them)
  const protectedPaths = ["/missions", "/tasks"];
  if (!hasSession && protectedPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // Authenticated users hitting signin → redirect to watch
  if (hasSession && pathname === "/auth/signin") {
    return NextResponse.redirect(new URL("/watch", req.url));
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
      "https://blinkworld.xyz",
      "https://www.blinkworld.xyz",
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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://api.mapbox.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
    "font-src 'self' https://fonts.gstatic.com https://api.mapbox.com",
    "img-src 'self' data: blob: https:",
    "worker-src blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflare-eth.com https://api.mainnet-beta.solana.com https://mempool.space https://blockstream.info https://nominatim.openstreetmap.org https://api.dexscreener.com https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org https://*.web3modal.org https://*.web3modal.com https://pulse.walletconnect.org https://rpc.ankr.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.groq.com https://api.x.ai https://openrouter.ai https://api.mapbox.com https://events.mapbox.com https://api.coingecko.com",
    "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.org https://*.web3modal.com",
    "frame-ancestors 'self'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

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

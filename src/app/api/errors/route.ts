// POST /api/errors — receives client-side ErrorBoundary reports.
//
// Currently a no-op-but-200 endpoint: logs to the server console so the
// payload appears in Vercel logs but doesn't persist anywhere yet. The
// ErrorBoundary calls fetch('/api/errors') in production; without this
// handler the boundary would itself emit a 404 network error on top of
// the original failure, which is noisier than helpful.
//
// When Sentry (or a client_errors table) lands, swap the body of POST.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface ErrorReport {
  message?: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  timestamp?: string;
}

export async function POST(req: NextRequest) {
  let body: ErrorReport = {};
  try {
    body = (await req.json()) as ErrorReport;
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  const message = typeof body.message === "string" ? body.message.slice(0, 500) : "(no message)";
  const url = typeof body.url === "string" ? body.url.slice(0, 500) : "";
  console.error(`[client-error] ${message} | ${url}`);
  return NextResponse.json({ ok: true }, { status: 200 });
}

// app/duel/[code]/page.tsx
//
// Universal-link fallback: /duel/<CODE> is registered in the
// apple-app-site-association so iPhones with BLINK open the app directly.
// Everyone else lands here and is sent to the /b/<CODE> App Store landing.

import { redirect } from "next/navigation";

export default async function DuelFallbackPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/b/${encodeURIComponent(code)}`);
}

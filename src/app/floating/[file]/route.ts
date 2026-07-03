// app/floating/[file]/route.ts
//
// The iOS app (and the /u BLINK Card page) load creature art from
// https://blinkworld.xyz/floating/<slug>.png. The actual assets live in
// /public/floating-all as <nnn>_<slug>.webp — this route bridges the two by
// redirecting the slug URL to the real file. Unknown slugs 404.

import { NextResponse } from "next/server";
import { ALL_CREATURES } from "@/lib/creature-registry";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const slug = decodeURIComponent(file)
    .toLowerCase()
    .replace(/\.(png|webp|jpg)$/, "");
  const entry = ALL_CREATURES.find((c) => c.name.toLowerCase() === slug);
  if (!entry) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.redirect(new URL(entry.visual.animated, req.url), 308);
}

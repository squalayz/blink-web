#!/usr/bin/env node
/*
 * Phase 6 mobile audit — overflow detector.
 *
 * Loads the running landing page at multiple viewports and reports any
 * element whose scrollWidth exceeds the viewport width. Optionally writes
 * full-page screenshots.
 *
 * Usage:
 *   URL=http://localhost:3000 OUT=docs/phase6-screenshots SUFFIX=before \
 *     node scripts/mobile-overflow-check.mjs
 */
import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("/opt/homebrew/lib/node_modules/openclaw/node_modules/playwright-core"));
} catch {
  ({ chromium } = require("/usr/local/lib/node_modules/openclaw/node_modules/playwright-core"));
}

const URL = process.env.URL || "http://localhost:3000";
const OUT_DIR = process.env.OUT || path.resolve("docs/phase6-screenshots");
const SUFFIX = process.env.SUFFIX || "snap";
const SCREENSHOT = process.env.SCREENSHOT !== "0";

const VIEWPORTS = [
  { name: "iphone-se", width: 320, height: 568 },
  { name: "iphone-13", width: 390, height: 844 },
  { name: "iphone-plus", width: 430, height: 932 },
  { name: "ipad", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  // Pin to a chromium build that is locally present in ~/Library/Caches/ms-playwright.
  // playwright-core (1.48+) wants 1217; the system actually has 1208, so point at it.
  const candidates = [
    process.env.CHROMIUM_PATH,
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  ].filter(Boolean);
  let executablePath;
  for (const c of candidates) {
    try {
      await fs.access(c);
      executablePath = c;
      break;
    } catch {}
  }
  if (!executablePath) {
    throw new Error("No chromium executable found in ms-playwright cache");
  }
  const browser = await chromium.launch({ headless: true, executablePath });
  const summary = [];

  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 2,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    });
    const page = await ctx.newPage();
    // Bypass the one-shot CinematicLoad overlay so we screenshot real content.
    await ctx.addInitScript(() => {
      try {
        window.sessionStorage.setItem("blink:landing-cinematic:v1", "1");
      } catch {}
    });
    page.on("console", (msg) => {
      const t = msg.type();
      if (t === "error" || t === "warning") {
        // eslint-disable-next-line no-console
        console.log(`  [${v.name} console.${t}]`, msg.text().slice(0, 200));
      }
    });
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Give Next.js + the dynamic chunks time to mount before we measure.
    await page.waitForTimeout(2500);
    // Trigger all RevealOnScroll observers + force any leftover hidden ones
    // to be visible so the Bestiary/Mythics get audited.
    await page.evaluate(async () => {
      const total = document.documentElement.scrollHeight;
      const step = Math.max(160, window.innerHeight * 0.5);
      for (let y = 0; y <= total; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 260));
      }
      window.scrollTo(0, 0);
      document.querySelectorAll('div[style*="opacity"]').forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        }
      });
    });
    await page.waitForTimeout(1500);
    // Confirm the bestiary grid mounted (dynamic + ssr:false). Wait for it.
    await page
      .waitForSelector(".blink-bestiary-grid", { timeout: 8000 })
      .catch(() => console.log(`  [${v.name}] bestiary grid never appeared`));

    const offenders = await page.evaluate(() => {
      const DOC_W = document.documentElement.clientWidth;
      // Whitelist purely-decorative ancestors that are wider than viewport
      // by design (hero ticker animation track, hero map orbit rings, etc.)
      // Anything else that overshoots viewport is a real bug.
      const DECORATIVE_CLASSES = [
        "hero-ticker-track",
        "hero-map-ring",
        "hero-map-orbiter",
        "hero-map-bg",
        "hero-map-pulse",
        "hero-map-ping",
      ];
      const isDecorativeOrAriaHidden = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          if (n.getAttribute && n.getAttribute("aria-hidden") === "true") return true;
          const cls = (n.className || "").toString();
          for (const dc of DECORATIVE_CLASSES) {
            if (cls.includes(dc)) return true;
          }
          n = n.parentElement;
        }
        return false;
      };
      const out = [];
      const all = document.querySelectorAll("body *");
      for (const el of all) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.tagName === "STYLE" || el.tagName === "SCRIPT") continue;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const overshootsRight = r.right > DOC_W + 1;
        const scrollyOverflow =
          el.scrollWidth > Math.ceil(r.width) + 1 && cs.overflowX !== "hidden" && cs.overflowX !== "clip";
        if (!overshootsRight && !scrollyOverflow) continue;
        if (isDecorativeOrAriaHidden(el)) continue;
        out.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 80),
          id: el.id || "",
          scrollW: el.scrollWidth,
          rectLeft: Math.round(r.left),
          rectRight: Math.round(r.right),
          rectW: Math.round(r.width),
          text: (el.textContent || "").trim().slice(0, 50),
        });
      }
      // Dedupe nearly-identical ancestors
      const unique = [];
      const seen = new Set();
      for (const o of out) {
        const k = `${o.tag}|${o.cls}|${o.scrollW}|${o.rectRight}|${o.rectLeft}`;
        if (seen.has(k)) continue;
        seen.add(k);
        unique.push(o);
      }
      return {
        DOC_W,
        bodyScrollW: document.body.scrollWidth,
        htmlScrollW: document.documentElement.scrollWidth,
        offenders: unique.slice(0, 40),
      };
    });

    console.log(
      `\n[${v.name}] ${v.width}x${v.height}  DOC_W=${offenders.DOC_W}  body.scrollW=${offenders.bodyScrollW}  html.scrollW=${offenders.htmlScrollW}  → ${offenders.offenders.length} offending elements`,
    );
    for (const o of offenders.offenders.slice(0, 15)) {
      console.log(
        `  • <${o.tag.toLowerCase()}${o.id ? "#" + o.id : ""}${o.cls ? " ." + o.cls.replace(/\s+/g, ".") : ""}>  L=${o.rectLeft} R=${o.rectRight} W=${o.rectW}  "${o.text}"`,
      );
    }

    if (SCREENSHOT) {
      const file = path.join(OUT_DIR, `${v.name}-${SUFFIX}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  → ${file}`);
      // Also capture the bestiary in a tight viewport-only crop so we can
      // visually verify cards don't clip past the right edge.
      const bestiaryShot = path.join(OUT_DIR, `${v.name}-bestiary-${SUFFIX}.png`);
      const scrolled = await page.evaluate(() => {
        const g = document.querySelector(".blink-bestiary-grid");
        if (!g) return false;
        g.scrollIntoView({ block: "start", behavior: "instant" });
        return true;
      });
      if (scrolled) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: bestiaryShot, fullPage: false });
        console.log(`  → ${bestiaryShot}`);
      }
      // Token strip too
      const tokenShot = path.join(OUT_DIR, `${v.name}-token-${SUFFIX}.png`);
      const scrolled2 = await page.evaluate(() => {
        const g = document.querySelector(".blink-token-strip-row");
        if (!g) return false;
        g.scrollIntoView({ block: "center", behavior: "instant" });
        return true;
      });
      if (scrolled2) {
        await page.waitForTimeout(300);
        await page.screenshot({ path: tokenShot, fullPage: false });
        console.log(`  → ${tokenShot}`);
      }
      // Hero (top)
      const heroShot = path.join(OUT_DIR, `${v.name}-hero-${SUFFIX}.png`);
      await page.evaluate(() => {
        const html = document.documentElement;
        const prev = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto";
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.body.scrollTop = 0;
        html.scrollTop = 0;
        html.style.scrollBehavior = prev;
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: heroShot, fullPage: false });
      console.log(`  → ${heroShot}`);
      // MintFoundersCTA (recruiter card)
      const mintShot = path.join(OUT_DIR, `${v.name}-mint-${SUFFIX}.png`);
      const scrolled3 = await page.evaluate(() => {
        const g = document.querySelector("#mint-founders");
        if (!g) return false;
        g.scrollIntoView({ block: "start", behavior: "auto" });
        return true;
      });
      if (scrolled3) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: mintShot, fullPage: false });
        console.log(`  → ${mintShot}`);
      }
      // Council
      const councilShot = path.join(OUT_DIR, `${v.name}-council-${SUFFIX}.png`);
      const scrolled4 = await page.evaluate(() => {
        const heads = Array.from(document.querySelectorAll("section"));
        const c = heads.find((s) => (s.textContent || "").includes("The Council"));
        if (!c) return false;
        c.scrollIntoView({ block: "start", behavior: "auto" });
        return true;
      });
      if (scrolled4) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: councilShot, fullPage: false });
        console.log(`  → ${councilShot}`);
      }
    }

    summary.push({
      viewport: v.name,
      width: v.width,
      DOC_W: offenders.DOC_W,
      bodyScrollW: offenders.bodyScrollW,
      htmlScrollW: offenders.htmlScrollW,
      offenderCount: offenders.offenders.length,
    });

    await ctx.close();
  }

  await browser.close();

  console.log("\n=== summary ===");
  for (const s of summary) {
    const bad =
      s.bodyScrollW > s.DOC_W + 1 || s.htmlScrollW > s.DOC_W + 1 || s.offenderCount > 0;
    console.log(
      `${bad ? "FAIL" : "OK  "}  ${s.viewport.padEnd(12)}  width=${s.width}  body=${s.bodyScrollW}  offenders=${s.offenderCount}`,
    );
  }

  const anyFail = summary.some(
    (s) => s.bodyScrollW > s.DOC_W + 1 || s.htmlScrollW > s.DOC_W + 1 || s.offenderCount > 0,
  );
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

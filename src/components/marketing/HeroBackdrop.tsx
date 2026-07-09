"use client";

// Cinematic parallax backdrop behind the landing hero: the alpine BLINK
// hunt art (brand/hero-mountain-hd.jpg) drifting slower than the page and
// fading out as the hero scrolls away — framer-motion scroll-linked
// transforms (LazyMotion keeps the bundle to the dom-animation subset).
// Decorative only: aria-hidden, pointer-events none, fades in after the
// image decodes so it never competes with the LCP text. Disabled entirely
// under prefers-reduced-motion (static, no parallax).

import { useState } from "react";
import Image from "next/image";
import {
  LazyMotion,
  domAnimation,
  m,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

export default function HeroBackdrop() {
  return (
    <LazyMotion features={domAnimation} strict>
      <Backdrop />
    </LazyMotion>
  );
}

function Backdrop() {
  const reduced = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const { scrollY } = useScroll();
  // Background scrolls at ~1/4 speed, then dissolves before the creatures
  // section arrives. The wrapper overscans vertically so the drift never
  // exposes an edge.
  const y = useTransform(scrollY, [0, 900], [0, 220]);
  const opacity = useTransform(scrollY, [0, 300, 780], [1, 0.9, 0]);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "min(860px, 108vh)",
        overflow: "hidden",
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      <m.div
        style={{
          position: "absolute",
          inset: "-16% 0 -10%",
          y: reduced ? 0 : y,
          opacity: reduced ? 1 : opacity,
          willChange: "transform, opacity",
        }}
      >
        <Image
          src="/brand/hero-mountain-hd.jpg"
          alt=""
          fill
          quality={45}
          sizes="100vw"
          style={{
            objectFit: "cover",
            objectPosition: "center 22%",
            opacity: loaded ? 0.34 : 0,
            transition: "opacity 1.4s ease",
          }}
          onLoad={() => setLoaded(true)}
        />
        {/* veils: keep headline contrast and dissolve into the page bg */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(5,6,12,0.62) 0%, rgba(5,6,12,0.28) 34%, rgba(5,6,12,0.55) 68%, #05060C 97%)",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(120% 80% at 50% 30%, transparent 55%, rgba(5,6,12,0.75) 100%)",
          }}
        />
      </m.div>
    </div>
  );
}

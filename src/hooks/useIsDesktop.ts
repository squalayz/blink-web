"use client";

import { useState, useEffect } from "react";

interface ScreenInfo {
  isDesktop: boolean;
  isTablet: boolean;
  windowWidth: number;
}

export function useIsDesktop(): ScreenInfo {
  const [info, setInfo] = useState<ScreenInfo>({
    isDesktop: false,
    isTablet: false,
    windowWidth: 0,
  });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      setInfo({
        isDesktop: w >= 1024,
        isTablet: w >= 768,
        windowWidth: w,
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return info;
}

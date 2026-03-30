"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

interface OrbAnimationProps {
  size?: number;
  rarity?: "common" | "rare" | "legendary";
  pulsing?: boolean;
  cracking?: boolean;
  onCrackComplete?: () => void;
}

const rarityColors: Record<string, string> = {
  common: "#C0C0C0",
  rare: "#3B82F6",
  legendary: "#F59E0B",
};

export default function OrbAnimation({
  size = 120,
  rarity = "common",
  pulsing = false,
  cracking = false,
  onCrackComplete,
}: OrbAnimationProps) {
  const color = pulsing ? "#F59E0B" : rarityColors[rarity];

  useEffect(() => {
    if (cracking && onCrackComplete) {
      const timer = setTimeout(onCrackComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [cracking, onCrackComplete]);

  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${color}88, ${color}44 40%, ${color}11 70%, transparent)`,
        boxShadow: `0 0 ${size * 0.25}px ${color}66, 0 0 ${size * 0.5}px ${color}22, inset 0 0 ${size * 0.15}px ${color}44`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      animate={
        cracking
          ? {
              scale: [1, 1.2, 1.1, 1.3, 0],
              opacity: [1, 1, 1, 0.5, 0],
              rotate: [0, -5, 5, -10, 0],
            }
          : {
              scale: [1, pulsing ? 1.08 : 1.05, 1],
              boxShadow: [
                `0 0 ${size * 0.25}px ${color}66, 0 0 ${size * 0.5}px ${color}22`,
                `0 0 ${size * 0.4}px ${color}88, 0 0 ${size * 0.7}px ${color}33`,
                `0 0 ${size * 0.25}px ${color}66, 0 0 ${size * 0.5}px ${color}22`,
              ],
            }
      }
      transition={
        cracking
          ? { duration: 0.6, ease: "easeInOut" }
          : {
              duration: pulsing ? 0.8 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
    >
      {/* Inner highlight */}
      <div
        style={{
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 40%, ${color}66, transparent)`,
          position: "absolute",
          top: size * 0.15,
          left: size * 0.15,
          filter: "blur(4px)",
        }}
      />
    </motion.div>
  );
}

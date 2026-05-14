"use client";

import { useMemo } from "react";
import Image from "next/image";
import { BESTIARY, type Creature } from "@/lib/bestiary";

type SlotStyle = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
  opacity: number;
  animation: string;
};

const SLOTS: { style: SlotStyle; delay: string }[] = [
  { style: { top: "8%", right: "-50px", width: "150px", opacity: 0.5, animation: "blinkDrift1 18s ease-in-out infinite" }, delay: "0s" },
  { style: { top: "16%", left: "-60px", width: "140px", opacity: 0.42, animation: "blinkDrift2 24s ease-in-out infinite" }, delay: "1.2s" },
  { style: { top: "32%", right: "calc(8% - 30px)", width: "130px", opacity: 0.38, animation: "blinkDrift3 26s ease-in-out infinite" }, delay: "2.4s" },
  { style: { top: "40%", left: "-60px", width: "170px", opacity: 0.55, animation: "blinkDrift2 22s ease-in-out infinite" }, delay: "3s" },
  { style: { top: "54%", right: "-40px", width: "160px", opacity: 0.5, animation: "blinkDrift1 20s ease-in-out infinite" }, delay: "4s" },
  { style: { top: "62%", left: "calc(20% - 60px)", width: "140px", opacity: 0.35, animation: "blinkDrift4 28s ease-in-out infinite" }, delay: "5.5s" },
  { style: { top: "72%", right: "calc(25% - 40px)", width: "150px", opacity: 0.4, animation: "blinkDrift3 23s ease-in-out infinite" }, delay: "6.8s" },
  { style: { top: "78%", left: "-50px", width: "155px", opacity: 0.45, animation: "blinkDrift1 25s ease-in-out infinite" }, delay: "8s" },
  { style: { top: "86%", right: "-60px", width: "145px", opacity: 0.4, animation: "blinkDrift2 27s ease-in-out infinite" }, delay: "9s" },
  { style: { bottom: "6%", left: "calc(40% - 60px)", width: "135px", opacity: 0.32, animation: "blinkDrift4 30s ease-in-out infinite" }, delay: "10.5s" },
];

function pickMix(): Creature[] {
  const commons = BESTIARY.filter(c => c.rarity === "common");
  const uncommons = BESTIARY.filter(c => c.rarity === "uncommon");
  const rares = BESTIARY.filter(c => c.rarity === "rare");
  const legendaries = BESTIARY.filter(c => c.rarity === "legendary");

  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  return [
    ...shuffle(commons).slice(0, 4),
    ...shuffle(uncommons).slice(0, 3),
    ...shuffle(rares).slice(0, 2),
    ...shuffle(legendaries).slice(0, 1),
  ];
}

export function FloatingCreatures() {
  const picks = useMemo(() => {
    const mix = pickMix();
    return SLOTS.map((slot, i) => ({
      slot,
      creature: mix[i % mix.length],
    }));
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {picks.map(({ slot, creature }, i) => (
          <div
            key={`${creature.id}-${i}`}
            style={{
              position: "absolute",
              filter: "drop-shadow(0 0 22px rgba(0,255,136,0.4))",
              ...slot.style,
              animationDelay: slot.delay,
            }}
          >
            <Image
              src={creature.floating}
              alt=""
              width={200}
              height={200}
              style={{ width: "100%", height: "auto" }}
              priority={false}
            />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes blinkDrift1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-20px, 30px) rotate(-3deg); }
          50% { transform: translate(10px, 50px) rotate(2deg); }
          75% { transform: translate(-30px, 20px) rotate(-2deg); }
        }
        @keyframes blinkDrift2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -25px) rotate(4deg); }
          66% { transform: translate(20px, 40px) rotate(-3deg); }
        }
        @keyframes blinkDrift3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          30% { transform: translate(-25px, -30px) rotate(-4deg); }
          60% { transform: translate(-40px, 10px) rotate(3deg); }
        }
        @keyframes blinkDrift4 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          50% { transform: translate(40px, -40px) rotate(6deg) scale(1.05); }
        }
      `}</style>
    </>
  );
}

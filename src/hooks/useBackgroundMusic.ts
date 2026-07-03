"use client";

import { useEffect, useRef } from "react";
import { sounds, SOUND_ENABLED_EVENT } from "@/lib/sounds";

const MUSIC_SRC = "/music/exploration-theme.mp3";
const MUSIC_VOLUME = 0.35;

/**
 * Looping background exploration music, tied to the same enabled flag as the
 * SFX in lib/sounds (localStorage "blink:sound:enabled", toggled by
 * SoundToggle). The ~3MB file is not fetched until playback actually starts.
 */
export function useBackgroundMusic(): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const ensureAudio = (): HTMLAudioElement => {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.preload = "none";
        audio.src = MUSIC_SRC;
        audio.loop = true;
        audio.volume = MUSIC_VOLUME;
        audioRef.current = audio;
      }
      return audio;
    };

    const tryPlay = () => {
      if (!sounds.enabled) return;
      ensureAudio().play().catch(() => {
        /* autoplay blocked or playback interrupted — stay silent */
      });
    };

    // Browsers block autoplay with sound until a user gesture, so start on
    // the first click/tap/keypress anywhere on the page.
    const onFirstInteraction = () => tryPlay();
    document.addEventListener("pointerdown", onFirstInteraction, { once: true });
    document.addEventListener("keydown", onFirstInteraction, { once: true });

    // SoundToggle writes through sounds.setEnabled, which broadcasts this
    // event. The toggle click is itself a user gesture, so play() is allowed.
    const onEnabledChanged = (e: Event) => {
      const enabled = (e as CustomEvent<{ enabled: boolean }>).detail?.enabled;
      if (enabled) {
        tryPlay();
      } else {
        audioRef.current?.pause();
      }
    };
    window.addEventListener(SOUND_ENABLED_EVENT, onEnabledChanged);

    return () => {
      document.removeEventListener("pointerdown", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener(SOUND_ENABLED_EVENT, onEnabledChanged);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      }
    };
  }, []);
}

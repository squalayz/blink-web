"use client";

import { useEffect, useRef } from "react";
import { sounds, SOUND_ENABLED_EVENT, MUSIC_PLAYING_EVENT } from "@/lib/sounds";

// "Voxel Revolution" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0.
const MUSIC_SRC = "/music/blink-adventure-anthem.mp3";
const MUSIC_VOLUME = 0.35;
const FADE_IN_MS = 1800;
const FADE_OUT_MS = 250;

function broadcastPlaying(playing: boolean): void {
  window.dispatchEvent(
    new CustomEvent(MUSIC_PLAYING_EVENT, { detail: { playing } })
  );
}

/**
 * Looping background theme music, tied to the same enabled flag as the
 * SFX in lib/sounds (localStorage "blink:sound:enabled", toggled by
 * SoundToggle). The file is not fetched until playback actually starts.
 * Playback fades in over ~1.8s and fades out quickly (rather than
 * hard-stopping) when the user mutes.
 */
export function useBackgroundMusic(): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRaf = useRef<number | null>(null);

  useEffect(() => {
    const cancelFade = () => {
      if (fadeRaf.current !== null) {
        cancelAnimationFrame(fadeRaf.current);
        fadeRaf.current = null;
      }
    };

    const fadeTo = (
      audio: HTMLAudioElement,
      target: number,
      durationMs: number,
      onDone?: () => void
    ) => {
      cancelFade();
      const from = audio.volume;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / durationMs);
        // ease-out so the tail of the fade is gentle
        const eased = 1 - (1 - k) * (1 - k);
        audio.volume = from + (target - from) * eased;
        if (k < 1) {
          fadeRaf.current = requestAnimationFrame(step);
        } else {
          fadeRaf.current = null;
          onDone?.();
        }
      };
      fadeRaf.current = requestAnimationFrame(step);
    };

    const onPlaying = () => broadcastPlaying(true);
    const onPause = () => broadcastPlaying(false);

    const ensureAudio = (): HTMLAudioElement => {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.preload = "none";
        audio.src = MUSIC_SRC;
        audio.loop = true;
        audio.volume = 0;
        // Mirror real playback state to SoundToggle's equalizer.
        audio.addEventListener("playing", onPlaying);
        audio.addEventListener("pause", onPause);
        audioRef.current = audio;
      }
      return audio;
    };

    const tryPlay = () => {
      if (!sounds.enabled) return;
      const audio = ensureAudio();
      // If we're mid fade-out (user re-enabled quickly), fade back up from
      // wherever the volume currently is; otherwise start silent.
      if (audio.paused) audio.volume = 0;
      audio
        .play()
        .then(() => fadeTo(audio, MUSIC_VOLUME, FADE_IN_MS))
        .catch(() => {
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
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          fadeTo(audio, 0, FADE_OUT_MS, () => audio.pause());
        }
      }
    };
    window.addEventListener(SOUND_ENABLED_EVENT, onEnabledChanged);

    return () => {
      cancelFade();
      document.removeEventListener("pointerdown", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener(SOUND_ENABLED_EVENT, onEnabledChanged);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeEventListener("playing", onPlaying);
        audio.removeEventListener("pause", onPause);
        audio.src = "";
        audioRef.current = null;
      }
      broadcastPlaying(false);
    };
  }, []);
}

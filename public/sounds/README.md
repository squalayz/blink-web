# BLINK sound assets

Drop CC0 / royalty-free MP3s here using these exact filenames:

- `awaken.mp3` — ethereal pulse + chime (~2s), SIWE verify success
- `reveal.mp3` — mystical shimmer (~1s), YourBestiary cards mount-in
- `spotted.mp3` — short whisper/glint (~0.5s), first time a BLINK marker enters viewport
- `catchCommon.mp3` — soft chime up (~0.6s), Common BLINK catch
- `catchRare.mp3` — crystalline ring (~1s), Uncommon/Rare BLINK catch
- `catchMythic.mp3` — cinematic stinger (~2s), Legendary/Mythic catch
- `tick.mp3` — subtle UI tick (~0.1s), CTA hover

Source from freesound.org, opengameart.org, or Pixabay (CC0 / public domain only).
Combined total should stay under 500KB. No AI-generated audio.

Until real assets are added, `src/lib/sounds.ts` synthesises low-fidelity
placeholder tones via the Web Audio API so the trigger sites still fire.

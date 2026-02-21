"use client";

// ══ MishMesh Sound Manager ══
// All sounds generated with Web Audio API — no external files needed.
// Everything off by default. Toggle in Settings → "Enable mesh sounds"

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

// ── Settings Toggle Component ──
export function SoundToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>🔊 Mesh Sounds</div>
        <div style={{ fontSize: 11, color: "#6b6b80" }}>Ambient hum, match pings, connection clicks</div>
      </div>
      <button onClick={() => { onChange(!enabled); if (!enabled) playMatchPing(); }} style={{
        width: 40, height: 22, borderRadius: 11, border: "none",
        cursor: "pointer", background: enabled ? "#6366f1" : "#2a2a3a",
        position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "white",
          position: "absolute", top: 2, left: enabled ? 20 : 2,
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}

// ── Match Found Ping (soft, satisfying) ──
export function playMatchPing() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

// ── Orb Connect Click (quick snap) ──
export function playOrbConnect() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

// ── Chat Typing Tick ──
export function playTypingTick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

// ── Notification Chime ──
export function playNotifChime() {
  try {
    const ctx = getCtx();
    [660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch (e) {}
}

// ── Level Up Sound ──
export function playLevelUp() {
  try {
    const ctx = getCtx();
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  } catch (e) {}
}

// ── Ambient Mesh Hum (continuous, very low) ──
let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;

export function startAmbientHum() {
  try {
    if (ambientOsc) return;
    const ctx = getCtx();
    ambientOsc = ctx.createOscillator();
    ambientGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    ambientOsc.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(ctx.destination);
    ambientOsc.type = "sine";
    ambientOsc.frequency.setValueAtTime(80, ctx.currentTime);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 2);
    ambientOsc.start();
  } catch (e) {}
}

export function stopAmbientHum() {
  try {
    if (ambientGain) {
      const ctx = getCtx();
      ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => { ambientOsc?.stop(); ambientOsc = null; ambientGain = null; }, 1100);
    }
  } catch (e) {}
}

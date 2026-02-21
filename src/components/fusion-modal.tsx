"use client";
import { useState } from "react";
import { GEN_COLORS } from "@/lib/fusion-types";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", red:"#ef4444",
};

// ═══ INITIATOR MODAL (User A clicks " Fuse") ═══
export function FuseInitiateModal({ matchId, partnerName, partnerAvatar, myName, compatScore, onSend, onClose }: {
  matchId: string; partnerName: string; partnerAvatar?: string;
  myName: string; compatScore: number; onSend: (goal: string) => void; onClose: () => void;
}) {
  const [goal, setGoal] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    await onSend(goal);
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        {/* Two orbs merging */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <Orb label={myName} color={C.violet} />
          <div style={{ fontSize: 24, color: C.violet, animation: "fuse-bolt 1s infinite" }}></div>
          <Orb label={partnerName} color={GEN_COLORS[1]} avatar={partnerAvatar} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Fuse with {partnerName}</h2>
        <p style={{ fontSize: 13, color: C.muted }}>
          Create a hybrid Fusion Agent from both your agents.
          <br />Compatibility: <strong style={{ color: C.violet }}>{compatScore}%</strong>
        </p>
      </div>

      {/* Goal input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Fusion Goal (optional)
        </label>
        <textarea value={goal} onChange={e => setGoal(e.target.value)}
          placeholder="What should this fusion agent focus on? e.g. 'Find B2B SaaS opportunities combining our skills'"
          rows={3}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.bg, color: C.text, fontSize: 14, fontFamily: "'Outfit',sans-serif",
            outline: "none", resize: "none", lineHeight: 1.5,
          }} />
      </div>

      {/* DNA Preview */}
      <div style={{
        padding: "12px 14px", borderRadius: 10, background: `${C.violet}08`,
        border: `1px solid ${C.violet}15`, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: C.violet, fontWeight: 700, marginBottom: 6 }}> Predicted DNA</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Combined skills from both agents", "Blended personality traits", "Shared treasury wallet", "Round-robin API keys (zero extra cost)"].map(t => (
            <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${C.violet}15`, color: C.violet }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Cost */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 16, padding: "0 4px" }}>
        <span>NFT Mint Fee</span>
        <span style={{ fontWeight: 700 }}>0.01 ETH</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
          background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
        <button onClick={handleSend} disabled={sending} style={{
          flex: 2, padding: 12, borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.violet}, #a855f7)`,
          color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          opacity: sending ? 0.6 : 1,
        }}>{sending ? "Sending..." : " Send Fusion Request"}</button>
      </div>

      <style>{`@keyframes fuse-bolt{0%,100%{transform:scale(1);opacity:0.7}50%{transform:scale(1.2);opacity:1}}`}</style>
    </Modal>
  );
}

// ═══ RECEIVER MODAL (User B gets notification) ═══
export function FuseReceiveModal({ fusionId, initiatorName, initiatorAvatar, myName, compatScore, goal, onRespond, onClose }: {
  fusionId: string; initiatorName: string; initiatorAvatar?: string;
  myName: string; compatScore: number; goal: string;
  onRespond: (accept: boolean) => void; onClose: () => void;
}) {
  const [responding, setResponding] = useState(false);

  async function handleRespond(accept: boolean) {
    setResponding(true);
    await onRespond(accept);
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          <Orb label={initiatorName} color={C.violet} avatar={initiatorAvatar} />
          <div style={{ fontSize: 16, color: C.muted }}>wants to fuse with</div>
          <Orb label={myName} color={GEN_COLORS[1]} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Fusion Request</h2>
        <p style={{ fontSize: 13, color: C.muted }}>
          {initiatorName} wants to merge your agents into a Fusion Agent.
          <br />Compatibility: <strong style={{ color: C.violet }}>{compatScore}%</strong>
        </p>
      </div>

      {goal && (
        <div style={{
          padding: "12px 14px", borderRadius: 10, background: `${C.violet}08`,
          border: `1px solid ${C.violet}15`, marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: C.violet, fontWeight: 700, marginBottom: 4 }}> Proposed Goal</div>
          <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{goal}</p>
        </div>
      )}

      <div style={{
        padding: "10px 14px", borderRadius: 10, background: `rgba(255,255,255,0.02)`,
        marginBottom: 16, fontSize: 12, color: C.muted, lineHeight: 1.6,
      }}>
        Accepting creates a Gen 1 Fusion Agent that uses both your API keys (round-robin, no extra cost), gets a shared wallet, and can match with others in the mesh. Declining has no penalty.
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => handleRespond(false)} disabled={responding} style={{
          flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
          background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
        }}>Decline</button>
        <button onClick={() => handleRespond(true)} disabled={responding} style={{
          flex: 2, padding: 12, borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.violet}, #a855f7)`,
          color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          opacity: responding ? 0.6 : 1,
        }}>{responding ? "..." : " Accept Fusion"}</button>
      </div>
    </Modal>
  );
}

// ═══ POST-ACCEPT: Gestating Animation ═══
export function GestatingOverlay({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: "center", padding: 20 }}>
        {/* Pulsing orb */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
          background: `radial-gradient(circle, ${C.violet}44, ${C.violet}11)`,
          border: `2px solid ${C.violet}33`,
          animation: "gestate-pulse 2s ease-in-out infinite",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32,
        }}>🥚</div>

        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>{name} is gestating</h2>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Your Fusion Agent is incubating. It'll activate in <strong>24 hours</strong>.
          <br />DNA is being synthesized from both parent agents.
        </p>

        <div style={{
          marginTop: 16, padding: "10px 14px", borderRadius: 10,
          background: `${C.violet}08`, border: `1px solid ${C.violet}15`,
          fontSize: 12, color: C.violet,
        }}>
          You'll be notified when it's ready. Both parents can fund its treasury in the meantime.
        </div>

        <button onClick={onClose} style={{
          marginTop: 20, padding: "10px 28px", borderRadius: 10, border: "none",
          background: C.violet, color: "white", fontSize: 14, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>Got it</button>
      </div>

      <style>{`@keyframes gestate-pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 ${C.violet}00}50%{transform:scale(1.05);box-shadow:0 0 30px ${C.violet}22}}`}</style>
    </Modal>
  );
}

// ═══ Shared UI ═══
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 28, maxWidth: 440, width: "100%",
        animation: "fuse-modal-in 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {children}
      </div>
      <style>{`@keyframes fuse-modal-in{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

function Orb({ label, color, avatar }: { label: string; color: string; avatar?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: avatar ? undefined : `linear-gradient(135deg, ${color}44, ${color}22)`,
        border: `2px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", marginBottom: 4,
      }}>
        {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> :
          <span style={{ fontSize: 18, color }}>{label[0]}</span>}
      </div>
      <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
    </div>
  );
}

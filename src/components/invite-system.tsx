"use client";
import { useState } from "react";

const C = {
  bg:"#050508", surface:"#0a0a12", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

interface InviteData {
  code: string;
  message: string;      // AI-generated personalized invite
  inviterName: string;
  inviterIndustry: string;
  inviterColor: string;
}

// ═══ CREATE INVITE (dashboard panel) ═══
export function InviteCreator({ userName, userIndustry, orbColor }: {
  userName: string; userIndustry: string; orbColor: string;
}) {
  const [inviteeName, setInviteeName] = useState("");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateInvite() {
    if (!inviteeName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_invite", invitee_name: inviteeName }),
      });
      const data = await res.json();
      if (data.invite) {
        setInvite({
          code: data.invite.code,
          message: data.invite.message || `Hey — ${userName}'s agent thinks you'd be a great fit for the mesh. ${userName} builds ${userIndustry} and their agent flagged you as someone who might complement their skills. Want to see if your agent agrees?`,
          inviterName: userName,
          inviterIndustry: userIndustry,
          inviterColor: orbColor,
        });
      }
    } catch (e) {}
    setLoading(false);
  }

  function copyInvite() {
    if (!invite) return;
    const text = `${invite.message}\n\nJoin the mesh: https://mishmesh.ai/invite/${invite.code}`;
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function shareX() {
    if (!invite) return;
    const text = `${invite.message}\n\n mishmesh.ai/invite/${invite.code}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Invite Someone</h3>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Your agent will write a personalized invite.</p>

      {!invite ? (
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Who should your agent invite?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={inviteeName} onChange={e => setInviteeName(e.target.value)}
              placeholder="Name or @handle"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.dim}`,
                background: C.bg, color: C.text, fontSize: 14, fontFamily: "'Outfit',sans-serif", outline: "none",
              }}
              onKeyDown={e => e.key === "Enter" && generateInvite()}
            />
            <button onClick={generateInvite} disabled={loading} style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              opacity: loading ? 0.6 : 1,
            }}>{loading ? "..." : "Generate"}</button>
          </div>
        </div>
      ) : (
        <div style={{ animation: "inv-in 0.3s ease-out" }}>
          {/* Preview card */}
          <div style={{
            background: C.s2, border: `1px solid ${C.dim}`, borderRadius: 14,
            padding: 16, marginBottom: 14,
          }}>
            {/* Agent orb */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: `radial-gradient(circle at 40% 40%, ${orbColor}, ${orbColor}66)`,
                boxShadow: `0 0 10px ${orbColor}40`,
              }} />
              <span style={{ fontSize: 12, color: orbColor, fontWeight: 700 }}>{userName}'s Agent</span>
            </div>
            <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>{invite.message}</p>
            <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 8, background: `${C.indigo}0a`, display: "inline-block" }}>
              <span style={{ fontSize: 11, color: C.indigo, fontFamily: "'JetBrains Mono',monospace" }}>mishmesh.ai/invite/{invite.code}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={shareX} style={{
              flex: 2, padding: 10, borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>↗ Share on 𝕏</button>
            <button onClick={copyInvite} style={{
              flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${C.dim}`,
              background: "transparent", color: copied ? C.match : C.text, fontSize: 13,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{copied ? "✓ Copied" : " Copy"}</button>
          </div>

          <button onClick={() => { setInvite(null); setInviteeName(""); }} style={{
            marginTop: 10, background: "none", border: "none", color: C.muted,
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>← Create another invite</button>
        </div>
      )}

      <style>{`@keyframes inv-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ═══ INVITE LANDING PAGE (what the invitee sees) ═══
export function InviteLandingPreview({ inviterName, inviterColor, message, code }: {
  inviterName: string; inviterColor: string; message: string; code: string;
}) {
  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24, fontFamily: "'Outfit',sans-serif",
    }}>
      <div style={{ width: 400, maxWidth: "100%", textAlign: "center" }}>
        {/* Locked orb */}
        <div style={{ width: 100, height: 100, margin: "0 auto 20px", position: "relative" }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            background: `radial-gradient(circle at 40% 40%, ${inviterColor}44, ${inviterColor}22)`,
            border: `2px dashed ${inviterColor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "inv-orb-pulse 3s infinite",
          }}>
            <span style={{ fontSize: 28 }}></span>
          </div>
          {/* Crown for top agents */}
          <div style={{
            position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
            fontSize: 16, filter: "grayscale(0.8)",
          }}></div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 4 }}>{inviterName}'s agent invited you</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 24, maxWidth: 320, margin: "0 auto 24px" }}>{message}</p>

        <a href="/auth/signin" style={{
          display: "inline-block", padding: "14px 32px", borderRadius: 12,
          background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
          color: "white", fontSize: 16, fontWeight: 800, textDecoration: "none",
        }}>Connect your agent to see if you match →</a>

        <p style={{ fontSize: 12, color: C.dim, marginTop: 16 }}>Takes 30 seconds. Wallet-first. No passwords.</p>
      </div>

      <style>{`@keyframes inv-orb-pulse{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:0.8;transform:scale(1.05)}}`}</style>
    </div>
  );
}

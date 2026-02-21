"use client";
import { useState } from "react";
import type { TokenLaunch, LaunchStatus } from "@/lib/token-types";
import { STATUS_COLORS_TOKEN } from "@/lib/token-types";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", red:"#ef4444", gold:"#ffd700",
};

// ═══ PROPOSE MODAL ═══
export function TokenProposeModal({ fusionId, fusionName, onPropose, onClose }: {
  fusionId: string; fusionName: string;
  onPropose: (name: string, symbol: string, eth: number) => void; onClose: () => void;
}) {
  const [name, setName] = useState(fusionName + " Token");
  const [symbol, setSymbol] = useState(fusionName.replace(/[^A-Z]/gi, "").slice(0, 5).toUpperCase());
  const [eth, setEth] = useState("0.1");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    setSending(true);
    await onPropose(name, symbol, parseFloat(eth) || 0.1);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 28, maxWidth: 420, width: "100%",
        animation: "tl-in 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Launch Token</h2>
          <p style={{ fontSize: 13, color: C.muted }}>Born from <strong style={{ color: C.violet }}>{fusionName}</strong></p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Token Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="AlphaForge" style={{
              width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.bg, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
            }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Symbol</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase().slice(0, 6))} placeholder="ALPHA"
              maxLength={6} style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.bg, color: C.text, fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
                outline: "none", textTransform: "uppercase",
              }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Your ETH Contribution</label>
            <input value={eth} onChange={e => setEth(e.target.value)} type="number" step="0.01" min="0.01" style={{
              width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.bg, color: C.text, fontSize: 18, fontWeight: 800,
              fontFamily: "'JetBrains Mono',monospace", outline: "none", textAlign: "center",
            }} />
          </div>
        </div>

        {/* Token info */}
        <div style={{
          padding: "10px 14px", borderRadius: 10, background: `${C.violet}08`,
          border: `1px solid ${C.violet}15`, marginBottom: 16, fontSize: 12, color: C.muted, lineHeight: 1.6,
        }}>
          Supply: <strong>1,000,000 ${symbol}</strong>. You get 30% (300K). Co-founder gets 30%. Remaining 40% on bonding curve.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={sending || !name || !symbol} style={{
            flex: 2, padding: 12, borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.green}, #16a34a)`,
            color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            opacity: sending ? 0.6 : 1,
          }}>{sending ? "Sending..." : " Propose to Co-Founder"}</button>
        </div>

        <style>{`@keyframes tl-in{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      </div>
    </div>
  );
}

// ═══ PROPOSAL CARD (appears in Fusion chat) ═══
export function TokenProposalCard({ launch, isFounderA, userId, onAgree, onUpdate, onFund, onCancel }: {
  launch: TokenLaunch; isFounderA: boolean; userId: string;
  onAgree?: (myEth: number) => void; onUpdate?: (name: string, symbol: string) => void;
  onFund?: () => void; onCancel?: () => void;
}) {
  const [editName, setEditName] = useState(launch.token_name);
  const [editSymbol, setEditSymbol] = useState(launch.token_symbol);
  const [myEth, setMyEth] = useState(
    (isFounderA ? launch.founder_a_eth : launch.founder_b_eth)?.toString() || "0.1"
  );
  const [editing, setEditing] = useState(false);

  const myAgreed = isFounderA ? launch.founder_a_agreed : launch.founder_b_agreed;
  const otherAgreed = isFounderA ? launch.founder_b_agreed : launch.founder_a_agreed;
  const myFunded = isFounderA ? launch.founder_a_funded : launch.founder_b_funded;
  const otherFunded = isFounderA ? launch.founder_b_funded : launch.founder_a_funded;
  const statusColor = STATUS_COLORS_TOKEN[launch.status];

  return (
    <div style={{
      background: "#1a1a2e", border: `1px solid ${C.violet}33`, borderRadius: 14,
      padding: 18, maxWidth: 380,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}></span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Token Launch</span>
          <span style={{
            marginLeft: 8, fontSize: 10, padding: "2px 6px", borderRadius: 4,
            background: `${statusColor}15`, color: statusColor, fontWeight: 700,
          }}>{launch.status}</span>
        </div>
      </div>

      {/* Token info */}
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Token name" style={{
            padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.bg, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
          }} />
          <input value={editSymbol} onChange={e => setEditSymbol(e.target.value.toUpperCase())} placeholder="SYM"
            maxLength={6} style={{
              padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
              background: C.bg, color: C.text, fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
              outline: "none", textTransform: "uppercase",
            }} />
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => { onUpdate?.(editName, editSymbol); setEditing(false); }} style={{
              flex: 1, padding: 6, borderRadius: 6, border: "none",
              background: C.violet, color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Save</button>
            <button onClick={() => setEditing(false)} style={{
              padding: 6, borderRadius: 6, border: `1px solid ${C.border}`,
              background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{launch.token_name}</div>
          <div style={{ fontSize: 14, color: C.violet, fontFamily: "'JetBrains Mono',monospace" }}>${launch.token_symbol}</div>
          {launch.status === "PROPOSING" && !myAgreed && (
            <button onClick={() => setEditing(true)} style={{
              marginTop: 4, fontSize: 11, color: C.muted, background: "none", border: "none",
              cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
            }}>Suggest different name/symbol</button>
          )}
        </div>
      )}

      {/* Contributions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{
          flex: 1, padding: "8px 10px", borderRadius: 8, background: C.bg,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Founder A</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
            {parseFloat(String(launch.founder_a_eth || 0)).toFixed(2)} ETH
          </div>
          <div style={{ fontSize: 9, color: launch.founder_a_funded ? C.green : launch.founder_a_agreed ? C.violet : C.dim }}>
            {launch.founder_a_funded ? "✓ Funded" : launch.founder_a_agreed ? "Agreed" : "Pending"}
          </div>
        </div>
        <div style={{
          flex: 1, padding: "8px 10px", borderRadius: 8, background: C.bg,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Founder B</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
            {parseFloat(String(launch.founder_b_eth || 0)).toFixed(2)} ETH
          </div>
          <div style={{ fontSize: 9, color: launch.founder_b_funded ? C.green : launch.founder_b_agreed ? C.violet : C.dim }}>
            {launch.founder_b_funded ? "✓ Funded" : launch.founder_b_agreed ? "Agreed" : "Pending"}
          </div>
        </div>
      </div>

      {/* Actions based on status */}
      {launch.status === "PROPOSING" && !myAgreed && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: C.muted }}>Your ETH</label>
            <input value={myEth} onChange={e => setMyEth(e.target.value)} type="number" step="0.01" style={{
              width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
              background: C.bg, color: C.text, fontSize: 14, fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace", outline: "none", textAlign: "center",
            }} />
          </div>
          <button onClick={() => onAgree?.(parseFloat(myEth))} style={{
            width: "100%", padding: 10, borderRadius: 8, border: "none",
            background: C.green, color: "white", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>Agree & Set My Contribution</button>
        </div>
      )}

      {launch.status === "FUNDING" && !myFunded && (
        <button onClick={onFund} style={{
          width: "100%", padding: 12, borderRadius: 8, border: "none",
          background: `linear-gradient(135deg, ${C.green}, #16a34a)`,
          color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        }}>Fund {isFounderA ? launch.founder_a_eth : launch.founder_b_eth} ETH</button>
      )}

      {launch.status === "FUNDING" && myFunded && !otherFunded && (
        <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: C.violet }}>
          ✓ You funded. Waiting for co-founder...
        </div>
      )}

      {launch.status === "LIVE" && (
        <div style={{
          textAlign: "center", padding: "8px 0", fontSize: 14, fontWeight: 800,
          color: C.green,
        }}>
           TOKEN IS LIVE!
          <div style={{ marginTop: 4 }}>
            <a href={`/marketplace/${launch.id}`} style={{ fontSize: 12, color: C.violet }}>View on Marketplace →</a>
          </div>
        </div>
      )}

      {launch.status !== "LIVE" && launch.status !== "CANCELLED" && (
        <button onClick={onCancel} style={{
          width: "100%", marginTop: 8, padding: 6, borderRadius: 6,
          border: `1px solid ${C.border}`, background: "transparent",
          color: C.dim, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
        }}>Cancel Launch</button>
      )}
    </div>
  );
}

// ═══ DEPLOY CELEBRATION ═══
export function DeployAnimation({ name, symbol, onClose }: { name: string; symbol: string; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1300,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{ textAlign: "center", animation: "deploy-in 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{
          fontSize: 72, marginBottom: 16, animation: "deploy-rocket 1s ease-out",
        }}></div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.gold, marginBottom: 8 }}>
          ${symbol} IS LIVE!
        </h1>
        <p style={{ fontSize: 16, color: C.text, marginBottom: 4 }}>{name}</p>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
          Tradeable now on the MishMesh marketplace.
        </p>
        <button onClick={onClose} style={{
          padding: "12px 32px", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.gold}, #f59e0b)`,
          color: "#000", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        }}>View on Marketplace →</button>
        {/* Confetti particles */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${10 + Math.random() * 80}%`,
              top: `-${10 + Math.random() * 20}%`,
              width: 6 + Math.random() * 6,
              height: 6 + Math.random() * 6,
              borderRadius: Math.random() > 0.5 ? "50%" : 0,
              background: [C.gold, C.green, C.violet, "#ec4899", "#06b6d4"][Math.floor(Math.random() * 5)],
              animation: `confetti ${2 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
            }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes deploy-in{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
        @keyframes deploy-rocket{0%{transform:translateY(100px) scale(0.5);opacity:0}50%{transform:translateY(-10px) scale(1.1)}100%{transform:translateY(0) scale(1);opacity:1}}
        @keyframes confetti{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(100vh) rotate(720deg)}}
      `}</style>
    </div>
  );
}

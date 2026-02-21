"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import VentureCard from "@/components/venture-card";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a", hot:"#ff2d55",
};

export default function VentureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ventureId = params.id as string;
  const [venture, setVenture] = useState<any>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [tab, setTab] = useState<"overview" | "plan" | "chat" | "invest">("overview");
  const [isMember, setIsMember] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [investAmount, setInvestAmount] = useState("0.01");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadVenture(); }, [ventureId]);
  useEffect(() => { if (tab === "chat") loadChat(); }, [tab]);

  async function loadVenture() {
    try {
      const res = await fetch("/api/venture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_venture", venture_id: ventureId }),
      });
      const data = await res.json();
      setVenture(data.venture);
      setInvestments(data.investments || []);
      setIsMember(data.isMember);
      setIsFounder(data.isFounder);
    } catch (e) {}
    setLoading(false);
  }

  async function loadChat() {
    const res = await fetch("/api/venture", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "venture_chat_history", venture_id: ventureId }),
    });
    const data = await res.json();
    setMessages(data.messages || []);
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 100);
  }

  async function sendMsg() {
    if (!newMsg.trim()) return;
    await fetch("/api/venture", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "venture_chat_send", venture_id: ventureId, message: newMsg }),
    });
    setNewMsg("");
    loadChat();
  }

  async function investInVenture() {
    const amt = parseFloat(investAmount);
    if (isNaN(amt) || amt < 0.001) return;
    await fetch("/api/venture", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invest", venture_id: ventureId, amount_eth: amt }),
    });
    loadVenture();
    setTab("overview");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.dim}`, borderTopColor: C.indigo, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!venture) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Venture not found</h2>
        <button onClick={() => router.push("/dashboard")} style={{ marginTop: 12, color: C.indigo, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← Back to Dashboard</button>
      </div>
    </div>
  );

  const members = venture.venture_members || [];
  const plan = venture.business_plan || {};

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif", padding: "80px 24px 100px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 16, fontFamily: "inherit" }}>← Back</button>

        {/* Venture Card (constellation) */}
        <VentureCard
          name={venture.name}
          description={venture.description}
          members={members.map((m: any) => ({
            name: m.users?.name || "?", role: m.role, fit_score: m.fit_score, status: m.status,
          }))}
          synergy={venture.team_synergy_score || 0}
          totalFunded={parseFloat(venture.total_funded_eth) || 0}
          fundingGoal={parseFloat(venture.funding_goal_eth) || undefined}
          status={venture.status}
        />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 20, marginBottom: 16, borderBottom: `1px solid ${C.dim}`, paddingBottom: 4 }}>
          {(["overview", "plan", ...(isMember || isFounder ? ["chat"] : []), "invest"] as ("invest"|"chat"|"overview"|"plan")[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "none",
              background: tab === t ? C.s2 : "transparent",
              color: tab === t ? C.text : C.muted,
              fontSize: 13, fontWeight: tab === t ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
            }}>{t === "plan" ? "📄 Plan" : t === "chat" ? "💬 Chat" : t === "invest" ? "⚡ Fund" : "Overview"}</button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <div>
            {/* Agent's Pitch */}
            {plan.why_this_team && (
              <div style={{ padding: "14px 16px", borderRadius: 12, background: `${C.gold}08`, border: `1px solid ${C.gold}15`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 6 }}>🤖 Agent's Pitch</div>
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{plan.why_this_team}</p>
              </div>
            )}

            {/* Team */}
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Team ({members.length})</h4>
            {members.map((m: any, i: number) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                borderRadius: 10, background: C.s2, marginBottom: 6,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.dim, overflow: "hidden" }}>
                  {m.users?.avatar_url && <img src={m.users.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.users?.name || "Pending"}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{m.role}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: m.fit_score >= 90 ? C.gold : C.indigo }}>{m.fit_score}%</div>
                  <span style={{
                    fontSize: 9, padding: "1px 6px", borderRadius: 4,
                    background: m.status === "accepted" ? `${C.match}15` : `${C.muted}15`,
                    color: m.status === "accepted" ? C.match : C.muted, fontWeight: 700,
                  }}>{m.status}</span>
                </div>
              </div>
            ))}

            {/* Investors */}
            {investments.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Investors ({investments.length})</h4>
                {investments.map((inv: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.dim}` }}>
                    <span style={{ fontSize: 13, color: C.text }}>{inv.users?.name || "Anon"}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>{parseFloat(inv.amount_eth).toFixed(4)} ETH</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ PLAN TAB ═══ */}
        {tab === "plan" && (
          <div>
            {Object.keys(plan).length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.dim }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <p>Business plan will be generated once the team is assembled.</p>
              </div>
            ) : (
              Object.entries(plan).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: C.indigo, marginBottom: 6, textTransform: "capitalize" }}>
                    {key.replace(/_/g, " ")}
                  </h4>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{val as string}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ CHAT TAB ═══ */}
        {tab === "chat" && (
          <div>
            <div ref={chatRef} style={{ maxHeight: 400, overflowY: "auto", marginBottom: 12 }}>
              {messages.map((msg: any, i: number) => (
                <div key={i} style={{
                  display: "flex", gap: 8, padding: "8px 0",
                  borderBottom: `1px solid ${C.dim}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: C.dim,
                    flexShrink: 0, overflow: "hidden",
                  }}>
                    {msg.users?.avatar_url && <img src={msg.users.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: msg.message_type === "system" ? C.cyan : C.text }}>
                      {msg.users?.name || "System"}
                    </span>
                    <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0", lineHeight: 1.5 }}>{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="Message the team..."
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.dim}`,
                  background: C.bg, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
                }} />
              <button onClick={sendMsg} style={{
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: C.indigo, color: "white", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Send</button>
            </div>
          </div>
        )}

        {/* ═══ INVEST TAB ═══ */}
        {tab === "invest" && (
          <div style={{ maxWidth: 380 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Fund this Venture</h3>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Invest ETH. Get proportional revenue share. All on-chain.</p>

            <div style={{ padding: "16px", borderRadius: 12, background: C.s2, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Amount (ETH)</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {["0.01", "0.05", "0.1", "0.5"].map(amt => (
                  <button key={amt} onClick={() => setInvestAmount(amt)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8,
                    border: `1px solid ${investAmount === amt ? C.gold : C.dim}`,
                    background: investAmount === amt ? `${C.gold}0a` : "transparent",
                    color: investAmount === amt ? C.gold : C.muted,
                    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>{amt}</button>
                ))}
              </div>
              <input value={investAmount} onChange={e => setInvestAmount(e.target.value)} type="number" step="0.001" min="0.001"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.dim}`,
                  background: C.bg, color: C.text, fontSize: 18, fontWeight: 800,
                  fontFamily: "'JetBrains Mono',monospace", outline: "none", textAlign: "center",
                }} />

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.dim }}>
                <span>Platform fee (10%): {(parseFloat(investAmount) * 0.1 || 0).toFixed(4)} ETH</span>
                <span>Net investment: {(parseFloat(investAmount) * 0.9 || 0).toFixed(4)} ETH</span>
              </div>
            </div>

            <button onClick={investInVenture} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${C.gold}, ${C.match})`,
              color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>⚡ Invest {investAmount} ETH</button>

            <p style={{ fontSize: 10, color: C.dim, textAlign: "center", marginTop: 8 }}>
              Investment is tracked on-chain. Returns distributed automatically via smart contract.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

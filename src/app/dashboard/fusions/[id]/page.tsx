"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { GEN_COLORS, STATUS_COLORS, STATUS_LABELS, type FusionDNA, type FusionStatus } from "@/lib/fusion-types";
import { TokenProposeModal, TokenProposalCard } from "@/components/token-launch";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", red:"#ef4444",
};

export default function FusionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fusionId = params.id as string;
  const [fusion, setFusion] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [lineage, setLineage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "activity" | "dna" | "treasury">("chat");
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [tokenLaunch, setTokenLaunch] = useState<any>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadFusion(); }, [fusionId]);

  async function loadFusion() {
    try {
      const res = await fetch("/api/fusions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detail", fusion_id: fusionId }),
      });
      const data = await res.json();
      setFusion(data.fusion);
      setActivity(data.activity || []);
      setLineage(data.lineage || []);
      // Extract chat messages from activity
      setChatHistory((data.activity || []).filter((a: any) => a.type === "message").reverse());
    } catch (e) {}
    setLoading(false);

    // Load token launch for this fusion
    try {
      const tRes = await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portfolio" }),
      });
      const tData = await tRes.json();
      const myLaunch = (tData.launches || []).find((l: any) => l.fusion_id === fusionId);
      if (myLaunch) setTokenLaunch(myLaunch);
    } catch (e) {}
  }

  async function sendChat() {
    if (!chatMsg.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/fusions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", fusion_id: fusionId, message: chatMsg }),
      });
      const data = await res.json();
      setChatHistory(prev => [
        ...prev,
        { type: "message", content: { role: "user", text: chatMsg }, created_at: new Date().toISOString() },
        { type: "message", content: { role: "assistant", text: data.response }, created_at: new Date().toISOString() },
      ]);
      setChatMsg("");
      setTimeout(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, 100);
    } catch (e) {}
    setSending(false);
  }

  async function handleDissolve() {
    if (!confirm("Dissolve this fusion? Treasury will be distributed back.")) return;
    await fetch("/api/fusions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dissolve", fusion_id: fusionId }),
    });
    router.push("/dashboard/fusions");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.dim}`, borderTopColor: C.violet, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!fusion) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Fusion not found</h2>
        <button onClick={() => router.push("/dashboard/fusions")} style={{ marginTop: 12, color: C.violet, background: "none", border: "none", cursor: "pointer" }}>← Back</button>
      </div>
    </div>
  );

  const dna: FusionDNA = fusion.dna || {};
  const genColor = GEN_COLORS[Math.min(fusion.generation - 1, 4)];
  const statusColor = STATUS_COLORS[fusion.status as FusionStatus];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif", padding: "80px 24px 100px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button onClick={() => router.push("/dashboard/fusions")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 16, fontFamily: "inherit" }}>← Back to Fusions</button>

        {/* ═══ HERO ═══ */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 24, marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: `linear-gradient(135deg, ${genColor}33, ${genColor}11)`,
              border: `2px solid ${genColor}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, flexShrink: 0,
            }}>
              {fusion.status === "gestating" ? "🥚" : fusion.status === "active" ? "⚡" : "🧬"}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>{fusion.name}</h1>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6,
                  background: `${genColor}22`, color: genColor, fontWeight: 800,
                }}>Gen {fusion.generation}</span>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6,
                  background: `${statusColor}15`, color: statusColor, fontWeight: 700,
                }}>{STATUS_LABELS[fusion.status as FusionStatus]}</span>
              </div>

              {fusion.goal && <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>{fusion.goal}</p>}

              {/* DNA trait pills */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {dna.traits && Object.entries(dna.traits).map(([trait, value]) => (
                  <span key={trait} style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 6,
                    background: `${C.violet}11`, color: C.violet, fontWeight: 600,
                  }}>{trait}: {((value as number) * 100).toFixed(0)}%</span>
                ))}
                {dna.communication_style && (
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: `${C.dim}`, color: C.muted, fontWeight: 600 }}>
                    {dna.communication_style}
                  </span>
                )}
              </div>

              {/* Parents */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: C.dim }}>Parents:</span>
                {[fusion.parent_a, fusion.parent_b].filter(Boolean).map((p: any, i: number) => (
                  <span key={i} style={{ fontSize: 11, color: C.muted }}>{p?.name || "?"}{i === 0 ? " ×" : ""}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {(["chat", "activity", "dna", "treasury"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: tab === t ? `${C.violet}15` : "transparent",
              color: tab === t ? C.violet : C.muted,
              fontSize: 13, fontWeight: tab === t ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
            }}>{t === "dna" ? "🧬 DNA" : t === "chat" ? "💬 Chat" : t === "treasury" ? "💰 Treasury" : "📋 Activity"}</button>
          ))}
        </div>

        {/* ═══ CHAT TAB ═══ */}
        {tab === "chat" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            {fusion.status !== "active" ? (
              <div style={{ padding: 32, textAlign: "center", color: C.muted }}>
                {fusion.status === "gestating" ? "🥚 Fusion is still gestating. Chat available once active." : "Fusion is not active."}
              </div>
            ) : (
              <>
                <div ref={chatRef} style={{ maxHeight: 360, overflowY: "auto", padding: 16 }}>
                  {chatHistory.length === 0 && (
                    <div style={{ textAlign: "center", padding: 24, color: C.dim, fontSize: 13 }}>Start chatting with your Fusion Agent.</div>
                  )}
                  {chatHistory.map((msg, i) => {
                    const isUser = msg.content?.role === "user";
                    return (
                      <div key={i} style={{
                        display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
                        marginBottom: 8,
                      }}>
                        <div style={{
                          maxWidth: "75%", padding: "8px 12px", borderRadius: 10,
                          background: isUser ? `${C.violet}15` : C.bg,
                          border: `1px solid ${isUser ? C.violet + "22" : C.border}`,
                        }}>
                          <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5, margin: 0 }}>{msg.content?.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder="Talk to your fusion agent..."
                    style={{
                      flex: 1, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: C.bg, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
                    }} />
                  <button onClick={sendChat} disabled={sending} style={{
                    padding: "8px 18px", borderRadius: 8, border: "none",
                    background: C.violet, color: "white", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>{sending ? "..." : "Send"}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ ACTIVITY TAB ═══ */}
        {tab === "activity" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
            {activity.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: C.dim }}>No activity yet.</div>
            ) : (
              activity.filter(a => a.type !== "message").map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {a.type === "status_change" ? "🔄" : a.type === "treasury" ? "💰" : a.type === "reproduce" ? "🧬" : a.type === "dissolve" ? "💨" : a.type === "mutation" ? "🧪" : "📋"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.text }}>{formatActivity(a)}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ DNA TAB ═══ */}
        {tab === "dna" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>🧬 DNA Genome</h3>

            {/* Skills */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Skills</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(dna.skills || []).map(s => (
                  <span key={s} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: `${C.violet}11`, color: C.violet }}>{s}</span>
                ))}
              </div>
            </div>

            {/* Traits (bar chart) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8 }}>Personality Traits</div>
              {dna.traits && Object.entries(dna.traits).map(([trait, value]) => (
                <div key={trait} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.muted, width: 90, textTransform: "capitalize" }}>{trait}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.dim, overflow: "hidden" }}>
                    <div style={{
                      width: `${(value as number) * 100}%`, height: "100%", borderRadius: 3,
                      background: `linear-gradient(90deg, ${C.violet}, #a855f7)`,
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: C.muted, width: 30, textAlign: "right" }}>
                    {((value as number) * 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Mutations */}
            {(dna.mutations || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Mutations</div>
                {dna.mutations.map((m, i) => (
                  <div key={i} style={{
                    display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 4, marginRight: 4, marginBottom: 4,
                    background: m.delta > 0 ? `${C.green}15` : `${C.red}15`,
                    color: m.delta > 0 ? C.green : C.red,
                  }}>
                    {m.trait} {m.delta > 0 ? "+" : ""}{(m.delta * 100).toFixed(0)}% (Gen {m.generation})
                  </div>
                ))}
              </div>
            )}

            {/* Performance genes */}
            {dna.performance_genes && (
              <div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Performance Genes</div>
                {Object.entries(dna.performance_genes).map(([gene, val]) => (
                  <div key={gene} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: C.muted, width: 120, textTransform: "capitalize" }}>{gene.replace(/_/g, " ")}</span>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.dim }}>
                      <div style={{ width: `${(val as number) * 100}%`, height: "100%", borderRadius: 2, background: genColor }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TREASURY TAB ═══ */}
        {tab === "treasury" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Treasury Balance</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.text }}>{parseFloat(fusion.treasury_balance || 0).toFixed(4)} <span style={{ fontSize: 16, color: C.muted }}>ETH</span></div>
              {fusion.wallet_address && (
                <div style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono',monospace", marginTop: 4 }}>
                  {fusion.wallet_address.slice(0, 8)}...{fusion.wallet_address.slice(-6)}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button style={{
                flex: 1, padding: 12, borderRadius: 10, border: "none",
                background: C.violet, color: "white", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>Deposit ETH</button>
              <button style={{
                flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.muted, fontSize: 14,
                cursor: "pointer", fontFamily: "inherit",
              }}>Withdraw</button>
            </div>
            <p style={{ fontSize: 11, color: C.dim, textAlign: "center" }}>2-of-2 multisig — both parents must approve withdrawals.</p>
          </div>
        )}

        {/* ═══ MINI LINEAGE ═══ */}
        <div style={{ marginTop: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>🧬 Lineage</h4>
            <button onClick={() => router.push("/dashboard/lineage")} style={{
              fontSize: 11, color: C.violet, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>Full bloodline →</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            {lineage.map((l: any, i: number) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, margin: "0 auto 4px",
                  background: l.parent_agent ? `${C.violet}22` : `${genColor}22`,
                  border: `1.5px solid ${l.parent_agent ? C.violet : genColor}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: C.muted,
                }}>{l.parent_agent ? "A" : `G${l.parent_fusion?.generation || "?"}`}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{l.parent_agent?.name || l.parent_fusion?.name || "?"}</div>
                <div style={{ fontSize: 9, color: C.dim }}>({l.side})</div>
              </div>
            ))}
            {lineage.length > 0 && <div style={{ fontSize: 16, color: C.dim }}>→</div>}
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, margin: "0 auto 4px",
                background: `${genColor}33`, border: `2px solid ${genColor}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>⚡</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{fusion.name}</div>
            </div>
          </div>
        </div>

        {/* ═══ TOKEN LAUNCH SECTION ═══ */}
        {fusion.status === "active" && (
          <div style={{ marginTop: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>🚀 Token</h4>
            </div>
            {tokenLaunch ? (
              tokenLaunch.status === "LIVE" ? (
                <button onClick={() => router.push(`/marketplace/${tokenLaunch.id}`)} style={{
                  width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${C.green}33`,
                  background: `${C.green}08`, color: C.green, fontSize: 14, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                }}>
                  ${tokenLaunch.token_symbol} is LIVE! · {parseFloat(tokenLaunch.current_price || 0).toFixed(6)} ETH · {tokenLaunch.holder_count || 0} holders
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 2 }}>View on Marketplace →</div>
                </button>
              ) : (
                <div style={{ fontSize: 13, color: C.muted }}>
                  Token <strong>${tokenLaunch.token_symbol}</strong> is {tokenLaunch.status.toLowerCase()}.
                  {tokenLaunch.status === "FUNDING" && " Fund your ETH to deploy."}
                </div>
              )
            ) : (
              <button onClick={() => setShowTokenModal(true)} style={{
                width: "100%", padding: 14, borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.green}, #16a34a)`,
                color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              }}>🚀 Launch Token</button>
            )}
          </div>
        )}

        {/* Token Propose Modal */}
        {showTokenModal && fusion && (
          <TokenProposeModal
            fusionId={fusionId}
            fusionName={fusion.name}
            onPropose={async (name, symbol, eth) => {
              await fetch("/api/tokens", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "propose", fusion_id: fusionId, token_name: name, token_symbol: symbol, my_eth: eth }),
              });
              setShowTokenModal(false);
              loadFusion();
            }}
            onClose={() => setShowTokenModal(false)}
          />
        )}

        {/* Dissolve */}
        {(fusion.status === "active" || fusion.status === "dormant") && (
          <button onClick={handleDissolve} style={{
            marginTop: 20, width: "100%", padding: 10, borderRadius: 10,
            border: `1px solid ${C.red}22`, background: `${C.red}08`,
            color: C.red, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>Dissolve Fusion</button>
        )}
      </div>
    </div>
  );
}

function formatActivity(a: any): string {
  const c = a.content || {};
  if (a.type === "status_change") return `Status: ${c.from || "—"} → ${c.to}`;
  if (a.type === "treasury") return `${c.action}: ${c.amount_eth} ETH`;
  if (a.type === "reproduce") return `Reproduced → Gen ${c.generation} child`;
  if (a.type === "dissolve") return `Dissolved. Treasury distributed.`;
  if (a.type === "mutation") return `Mutation: ${c.trait} ${c.delta > 0 ? "+" : ""}${c.delta}`;
  return a.type;
}

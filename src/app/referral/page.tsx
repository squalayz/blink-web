"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#050508", surface:"#0a0a12", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", hot:"#ff2d55", gold:"#ffd700",
  text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a", border:"#1a1a2e",
};

export default function ReferralPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if logged in
    fetch("/api/auth/siwe/session").then(r => r.json()).then(data => {
      if (data?.id) {
        setUser(data);
        // Fetch referral stats
        fetch("/api/match", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "referral_stats" }),
        }).then(r => r.json()).then(s => setStats(s)).catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refLink = user ? `https://mishmesh.ai/invite/${user.referral_code || user.id?.slice(0, 8)}` : "";

  function copyLink() {
    navigator.clipboard?.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareX() {
    const text = `I'm using MishMesh.ai — AI agents that trade for you on Base. Sign up with my link and we both earn.\n\n${refLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif", color: C.text }}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.2)}50%{box-shadow:0 0 40px rgba(99,102,241,0.4),0 0 15px rgba(6,182,212,0.2)}}
        @keyframes count-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        body{margin:0}
      `}</style>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 24px 40px", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ fontSize: 48, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>💰</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
          Refer & <span style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Earn 30%</span>
        </h1>
        <p style={{ fontSize: 16, color: C.muted, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Invite friends to MishMesh. Every time they deposit or trade, you earn <strong style={{ color: C.text }}>30% of our platform fees</strong> — automatically, forever.
        </p>

        {/* CTA */}
        {loading ? (
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.dim}`, borderTopColor: C.indigo, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        ) : user ? (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            {/* Referral link box */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {refLink}
              </div>
              <button onClick={copyLink} style={{ padding: "14px 20px", borderRadius: 12, border: "none", background: copied ? C.match : `linear-gradient(135deg, ${C.indigo}, ${C.purple})`, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minWidth: 80, transition: "all 0.2s" }}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={shareX} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s2, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Share on 𝕏
              </button>
              <button onClick={() => { navigator.share?.({ title: "MishMesh.ai", text: "AI agents that trade for you", url: refLink }); }} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s2, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Share Link
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => router.push("/auth/signin")} style={{
            padding: "16px 40px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
            color: "white", fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            boxShadow: `0 0 30px rgba(99,102,241,0.3)`, animation: "glow-pulse 2s ease-in-out infinite",
          }}>
            Sign Up & Get Your Link →
          </button>
        )}
      </div>

      {/* Stats (logged in only) */}
      {user && stats && (
        <div style={{ maxWidth: 480, margin: "0 auto 40px", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Referrals", value: stats.total_referrals || 0, color: C.indigo },
              { label: "Earned", value: `${(stats.total_rewards_eth || 0).toFixed(4)} ETH`, color: C.match },
              { label: "Rate", value: "30%", color: C.gold },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: C.surface, borderRadius: 14, padding: "16px 12px", textAlign: "center", border: `1px solid ${C.border}`, animation: `count-up 0.4s ease-out ${i * 0.1}s both` }}>
                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>How It Works</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { step: "1", emoji: "🔗", title: "Share Your Link", desc: "Copy your unique referral link and share it with friends, followers, or your community." },
            { step: "2", emoji: "👤", title: "They Sign Up", desc: "When someone creates a MishMesh account through your link, they're permanently linked to you." },
            { step: "3", emoji: "💰", title: "They Deposit ETH", desc: "MishMesh charges a 5% deposit fee. You earn 30% of that fee — automatically." },
            { step: "4", emoji: "🤖", title: "Their AI Trades", desc: "Every time their agent makes a trade (1% fee per trade), you earn 30% of that fee too." },
            { step: "5", emoji: "♾️", title: "Earn Forever", desc: "There's no cap and no expiration. As long as they use MishMesh, you earn." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.indigo}10`, border: `1px solid ${C.indigo}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
                {item.emoji}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Earnings example */}
        <div style={{ marginTop: 40, background: C.surface, borderRadius: 16, padding: 24, border: `1px solid ${C.indigo}22` }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, textAlign: "center" }}>💡 Example Earnings</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { scenario: "Friend deposits 1 ETH", fee: "0.05 ETH (5%)", you: "0.015 ETH", color: C.match },
              { scenario: "Friend trades 0.5 ETH", fee: "0.005 ETH (1%)", you: "0.0015 ETH", color: C.match },
              { scenario: "10 friends × $100/month each", fee: "~0.5 ETH in fees", you: "~0.15 ETH/month", color: C.gold },
            ].map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: C.s2, borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{e.scenario}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{e.fee}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: e.color }}>+{e.you}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, textAlign: "center" }}>FAQ</h3>
          {[
            { q: "When do I get paid?", a: "Rewards are tracked instantly and credited to your account. Payouts accumulate automatically." },
            { q: "Is there a limit?", a: "No cap on referrals or earnings. Invite as many people as you want." },
            { q: "Do my referrals expire?", a: "Never. Once someone signs up through your link, you earn from their activity forever." },
            { q: "What if my referral invites someone?", a: "Currently rewards are single-tier. You earn from your direct referrals only." },
          ].map((faq, i) => (
            <div key={i} style={{ marginBottom: 16, padding: "14px 16px", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{faq.q}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        {!user && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button onClick={() => router.push("/auth/signin")} style={{
              padding: "16px 40px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 0 30px rgba(99,102,241,0.3)`,
            }}>
              Start Earning Now →
            </button>
          </div>
        )}

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a href="/" style={{ color: C.muted, fontSize: 13, textDecoration: "none" }}>← Back to MishMesh.ai</a>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

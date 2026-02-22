"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { InviteLandingPreview } from "@/components/invite-system";

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Store invite code for claim during signup
    if (code) localStorage.setItem("mm_invite_code", code);
    
    fetch(`/api/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_invite", code }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.invite) setInvite(data.invite);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #2a2a3a", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!invite) {
    return (
      <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}></div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e8e8f0", marginBottom: 8 }}>Invite not found</h2>
          <p style={{ fontSize: 14, color: "#6b6b80" }}>This invite may have expired or already been claimed.</p>
          <a href="/" style={{ color: "#6366f1", textDecoration: "none", marginTop: 16, display: "inline-block" }}>← Back to MishMesh.ai</a>
        </div>
      </div>
    );
  }

  return (
    <InviteLandingPreview
      inviterName={invite.inviter_name || "A builder"}
      inviterColor={invite.inviter_color || "#6366f1"}
      message={invite.agent_message || `Someone's agent thinks you'd be a great fit for the mesh. Connect your agent to find out.`}
      code={code}
    />
  );
}

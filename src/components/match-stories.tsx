"use client";
import { useState } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", hot:"#ef4444", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

// ═══ MATCH STORY CARD ═══
interface MatchStory {
  id: string;
  user_a_name: string;
  user_b_name: string;
  user_a_color: string;
  user_b_color: string;
  score: number;
  story_text: string;
  created_at: string;
  public: boolean;
}

export function MatchStoryCard({ story, canPublish, onTogglePublic }: {
  story: MatchStory; canPublish?: boolean; onTogglePublic?: (id: string, pub: boolean) => void;
}) {
  return (
    <div style={{
      background: C.s2, border: `1px solid ${C.dim}`, borderRadius: 14,
      padding: 16, marginBottom: 10,
    }}>
      {/* Header: two orbs + names */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: `radial-gradient(${story.user_a_color}, ${story.user_a_color}66)` }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{story.user_a_name}</span>
        <span style={{ color: C.gold, fontSize: 12 }}></span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{story.user_b_name}</span>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: `radial-gradient(${story.user_b_color}, ${story.user_b_color}66)` }} />
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.gold, fontWeight: 800 }}>{story.score}%</span>
      </div>

      {/* Story text */}
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{story.story_text}</p>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 10, color: C.dim }}>{new Date(story.created_at).toLocaleDateString()}</span>
        {canPublish && (
          <button onClick={() => onTogglePublic?.(story.id, !story.public)} style={{
            padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.dim}`,
            background: story.public ? `${C.match}15` : "transparent",
            color: story.public ? C.match : C.muted, fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{story.public ? "✓ Public" : "Make Public"}</button>
        )}
      </div>
    </div>
  );
}

// ═══ PUBLIC STORY FEED ═══
export function StoryFeed({ stories }: { stories: MatchStory[] }) {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Match Stories</h3>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Real connections, real conversations.</p>
      {stories.map(s => <MatchStoryCard key={s.id} story={s} />)}
      {stories.length === 0 && (
        <div style={{ textAlign: "center", padding: 24, color: C.dim, fontSize: 13 }}>
          Stories appear after matched users exchange 5+ messages.
        </div>
      )}
    </div>
  );
}

// ═══ AGENT RIVALRY STATS ═══
interface RivalryData {
  myRank: number;
  totalAgents: number;
  percentile: number;         // "scored higher than 73% of agents"
  matchesThisWeek: number;
  nearbyRivals: { name: string; rank: number; delta: number }[]; // agents near your rank
  recentPassedBy?: string;    // "@cryptokai's agent just passed yours"
}

export function RivalryStats({ data }: { data: RivalryData }) {
  return (
    <div style={{ background: C.s2, border: `1px solid ${C.dim}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}></span>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Agent Rivalry</span>
      </div>

      {/* Percentile */}
      <div style={{
        padding: "10px 14px", borderRadius: 10, background: `${C.purple}08`,
        border: `1px solid ${C.purple}15`, marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, color: C.text }}>
          Your agent scored higher than <strong style={{ color: C.purple }}>{data.percentile}%</strong> of agents this week
        </div>
      </div>

      {/* Rank + distance to next */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: `${C.gold}08`, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>#{data.myRank}</div>
          <div style={{ fontSize: 10, color: C.muted }}>Your Rank</div>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: `rgba(255,255,255,0.02)`, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{data.matchesThisWeek}</div>
          <div style={{ fontSize: 10, color: C.muted }}>Matches/wk</div>
        </div>
      </div>

      {/* Nearby rivals */}
      {data.nearbyRivals.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Nearby Agents</div>
          {data.nearbyRivals.map((r, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "4px 0",
              borderBottom: i < data.nearbyRivals.length - 1 ? `1px solid ${C.dim}` : "none",
            }}>
              <span style={{ fontSize: 12, color: r.rank < data.myRank ? C.text : C.muted }}>
                #{r.rank} {r.name}
              </span>
              <span style={{ fontSize: 11, color: r.delta > 0 ? C.match : C.muted }}>
                {r.delta > 0 ? `${r.delta} more match${r.delta !== 1 ? "es" : ""} to pass` : "Behind you"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Passed by alert */}
      {data.recentPassedBy && (
        <div style={{
          padding: "8px 12px", borderRadius: 8, background: `${C.hot}08`,
          border: `1px solid ${C.hot}15`, fontSize: 12, color: C.hot,
          animation: "rivalry-flash 0.5s ease-out",
        }}>
           {data.recentPassedBy}'s agent just passed yours on the leaderboard
        </div>
      )}

      <style>{`@keyframes rivalry-flash{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

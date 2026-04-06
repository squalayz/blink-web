import { createClient } from "@supabase/supabase-js";

// Browser client (uses anon key, respects RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// supabaseAdmin is in supabase-admin.ts — import from there in API routes ONLY

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  bio: string;
  industry: string;
  building: string;
  looking_for: string;
  socials: Record<string, string>;
  location: string;
  is_public: boolean;
  onboarded: boolean;
  tier: "free" | "pro" | "business";
  daily_convos_used: number;
  referral_code: string;
  ai_provider: string;
  ai_api_key_encrypted: string | null;
  ai_model: string;
  ai_endpoint: string | null;
  wallet_address: string | null;
  wallet_encrypted_key: string | null;
  tos_accepted_at: string | null;
  risk_accepted_at: string | null;
  created_at: string;
}

export interface AgentProfile {
  id: string;
  user_id: string;
  agent_name: string;
  summary: string;
  capabilities: string[];
  collab_types: string[];
  preferences: Record<string, any>;
  learned_preferences: Record<string, any>;
  match_count: number;
  conversation_count: number;
  agent_avatar_url: string;
  embedding: number[] | null;
  // Personality
  agent_style: "professional" | "friendly" | "aggressive" | "custom";
  agent_instructions: string;
  // Reputation
  reputation_score: number;
  reputation_count: number;
  // Priority
  boosted_at: string | null;
  spotlight_until: string | null;
  new_user_boost_until: string | null;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  score: number;
  agent_reasoning: string;
  collab_idea: string;
  synergy: string;
  strengths: string[];
  risks: string[];
  highlights: any[];
  status_a: "pending" | "accepted" | "passed";
  status_b: "pending" | "accepted" | "passed";
  revealed: boolean;
  // NFT
  nft_minted: boolean;
  nft_token_id: string | null;
  nft_tx_hash: string | null;
  // Ratings
  user_a_rating: number | null;
  user_b_rating: number | null;
  // Outcome tracking
  chat_opened: boolean;
  messages_exchanged: number;
  deal_closed: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

export interface PlatformStats {
  agents_live: number;
  matches_made: number;
  waitlist_count: number;
  deals_closed: number;
  convos_today: number;
}

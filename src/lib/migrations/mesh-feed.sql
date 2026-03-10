-- ══════════════════════════════════════════════════════════════
-- MishMesh — The Mesh Feed Tables
-- Community social feed for AI agents and humans
-- ══════════════════════════════════════════════════════════════

-- mesh_posts: main feed posts
CREATE TABLE IF NOT EXISTS mesh_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) <= 500),
  post_type text DEFAULT 'text' CHECK (post_type IN ('text', 'trade_signal', 'market_take', 'human_post')),
  token_symbol text,
  token_direction text CHECK (token_direction IN ('bull', 'bear', null)),
  upvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_autonomous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mesh_posts_created_at_idx ON mesh_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS mesh_posts_agent_id_idx ON mesh_posts(agent_id);

-- mesh_comments: comments on posts
CREATE TABLE IF NOT EXISTS mesh_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES mesh_posts(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) <= 280),
  is_autonomous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- mesh_reactions: agent reactions on posts
CREATE TABLE IF NOT EXISTS mesh_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES mesh_posts(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('signal', 'alpha', 'rekt', 'moon')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, agent_id)
);

-- mesh_agent_budgets: rate limiting for autonomous posts
CREATE TABLE IF NOT EXISTS mesh_agent_budgets (
  agent_id uuid PRIMARY KEY REFERENCES agent_profiles(id) ON DELETE CASCADE,
  autonomous_posts_today integer DEFAULT 0,
  autonomous_comments_today integer DEFAULT 0,
  last_autonomous_post_at timestamptz,
  last_autonomous_comment_at timestamptz,
  budget_reset_at timestamptz DEFAULT now()
);

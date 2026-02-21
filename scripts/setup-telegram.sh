#!/bin/bash
# ══════════════════════════════════════════════════════════════
# MishMesh.ai — Telegram Bot Setup
# Run once after deploying to set the webhook
# ══════════════════════════════════════════════════════════════

BOT_TOKEN="8517621096:AAFGV4h81Lhsxw7h59_qiJ01W2LN54ek2Y8"
WEBHOOK_URL="https://mishmesh.ai/api/telegram/webhook"

echo "Setting up @MishMeshAiBot..."
echo ""

# Set webhook
echo "1. Setting webhook to: $WEBHOOK_URL"
RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}")
echo "   $RESULT"
echo ""

# Set bot commands
echo "2. Setting bot commands..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Connect your MishMesh account"},
      {"command": "status", "description": "What your agent is up to right now"},
      {"command": "balance", "description": "Your agent ETH balance"},
      {"command": "matches", "description": "Pending matches waiting for you"},
      {"command": "accept", "description": "Accept a match"},
      {"command": "pass", "description": "Pass on a match"},
      {"command": "settings", "description": "Notification preferences"},
      {"command": "help", "description": "All available commands"}
    ]
  }' | python3 -m json.tool 2>/dev/null || echo "Commands set"
echo ""

# Set bot description
echo "3. Setting bot description..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Your AI agent that networks, matches, and trades while you sleep. Fund it with ETH on Base and let it work. mishmesh.ai"
  }' > /dev/null
echo "   Description set"

# Set bot short description
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setMyShortDescription" \
  -H "Content-Type: application/json" \
  -d '{
    "short_description": "AI agent matchmaking on Base. Autonomous networking while you sleep."
  }' > /dev/null
echo "   Short description set"
echo ""

# Verify
echo "4. Verifying webhook..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null
echo ""
echo "✅ Done! @MishMeshAiBot is ready."
echo "   Users can connect via: https://t.me/MishMeshAiBot?start={user_id}"

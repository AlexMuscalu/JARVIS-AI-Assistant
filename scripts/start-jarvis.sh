#!/bin/bash
# JARVIS — one-click startup script
# Starts n8n + ngrok tunnel. Run this before opening Lovable.

# Load secrets from .env (never hardcoded here)
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

NGROK_DOMAIN="${NGROK_DOMAIN:-concurringly-overremiss-clementina.ngrok-free.dev}"
WEBHOOK_URL="https://${NGROK_DOMAIN}/webhook/n8n"
N8N_DOCKER_DIR="$HOME/N8N/n8n-Docker"
NGROK_BIN="$HOME/bin/ngrok"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║          J.A.R.V.I.S  STARTING          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── 1. Docker ────────────────────────────────────────────────────────────────
if ! docker info &>/dev/null; then
  echo "  [~] Starting Docker Desktop..."
  open -a Docker
  until docker info &>/dev/null; do sleep 2; done
fi
echo "  [✓] Docker ready"

# ── 2. n8n ───────────────────────────────────────────────────────────────────
if ! curl -s http://localhost:5678/healthz 2>/dev/null | grep -q '"status":"ok"'; then
  echo "  [~] Starting n8n..."
  cd "$N8N_DOCKER_DIR" && docker compose up -d
  until curl -s http://localhost:5678/healthz 2>/dev/null | grep -q '"status":"ok"'; do sleep 2; done
fi
echo "  [✓] n8n online"

# ── 3. ngrok (static domain) ─────────────────────────────────────────────────
if ! curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -q "$NGROK_DOMAIN"; then
  echo "  [~] Starting ngrok tunnel..."
  pkill -f "ngrok http" 2>/dev/null; sleep 1
  "$NGROK_BIN" http 5678 \
    --domain="$NGROK_DOMAIN" \
    --log=stdout --log-format=json \
    > /tmp/ngrok-jarvis.log 2>&1 &
  sleep 4
fi
echo "  [✓] Tunnel live → $WEBHOOK_URL"

# ── 4. Quick health check through tunnel ─────────────────────────────────────
HEALTH=$(curl -s "${WEBHOOK_URL/webhook\/n8n/healthz}" \
  -H "ngrok-skip-browser-warning: true" --max-time 5 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "  [✓] n8n reachable via public URL"
else
  echo "  [!] Tunnel health check failed — check /tmp/ngrok-jarvis.log"
fi

echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  JARVIS is ready. Open Lovable and start talking.   │"
echo "  │                                                     │"
echo "  │  Webhook : $WEBHOOK_URL"
echo "  │  To stop : pkill -f 'ngrok http'                   │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""

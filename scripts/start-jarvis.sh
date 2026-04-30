#!/bin/bash
# JARVIS local startup script
# Run this whenever you want to demo JARVIS on your machine

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_DIR/frontend"
N8N_DOCKER_DIR="$HOME/N8N/n8n-Docker"

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║       J.A.R.V.I.S  ONLINE       ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# 1 — Make sure Docker is running
if ! docker info &>/dev/null; then
  echo "  [!] Docker is not running. Starting Docker Desktop..."
  open -a Docker
  echo "  [~] Waiting for Docker to start..."
  until docker info &>/dev/null; do sleep 2; done
  echo "  [✓] Docker is ready"
fi

# 2 — Start n8n if not already running
if ! curl -s http://localhost:5678/healthz | grep -q '"status":"ok"'; then
  echo "  [~] Starting n8n..."
  cd "$N8N_DOCKER_DIR" && docker compose up -d
  echo "  [~] Waiting for n8n to come online..."
  until curl -s http://localhost:5678/healthz | grep -q '"status":"ok"'; do sleep 2; done
  echo "  [✓] n8n is online at http://localhost:5678"
else
  echo "  [✓] n8n already running"
fi

# 3 — Install frontend deps if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "  [~] Installing frontend dependencies..."
  cd "$FRONTEND_DIR" && npm install --silent
  echo "  [✓] Dependencies installed"
fi

# 4 — Start the frontend
echo "  [~] Starting JARVIS interface..."
echo "  [✓] Opening http://localhost:5173"
echo ""
echo "  Webhook URL  : http://localhost:5678/webhook/n8n"
echo "  Token        : 35dfeab43a62995965c1a2f3a3ebaf2c85f130593992ba47"
echo ""

# Open browser after a short delay
(sleep 3 && open "http://localhost:5173") &

cd "$FRONTEND_DIR" && npm run dev

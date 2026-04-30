# JARVIS — AI Personal Assistant

A voice-enabled AI personal assistant modelled after Iron Man's JARVIS. Built with an n8n multi-agent backend and a custom Iron Man HUD web interface.

![JARVIS Interface](docs/preview.png)

## What it does

Talk or type to JARVIS and it routes your request to the right agent automatically:

- **Email** — compose, send, and manage emails via Gmail
- **Calendar** — create and manage Google Calendar events
- **Contacts** — look up, add, and update contacts
- **Web Search** — live internet search via Tavily
- **Content Creation** — generate blog posts and written content
- **Calculator** — instant math

Multi-step chains work too: *"Email Nate asking when he wants to leave"* → JARVIS looks up Nate's email first, then sends the message.

---

## Architecture

```
Browser (Lovable / local React app)
    │  POST { query, sessionId }  X-JARVIS-Token: •••
    ▼
n8n Webhook  (localhost:5678)
    │
    ├── Validate Input  (guard: rejects empty queries → 400)
    ├── Check Validation  (IF node)
    │
    └── JARVIS Agent  (GPT-4o, ReAct pattern)
            ├── emailAgent        → Email sub-workflow
            ├── calendarAgent     → Calendar sub-workflow
            ├── contactAgent      → Contacts sub-workflow
            ├── contentCreator    → Content creation sub-workflow
            ├── Tavily            → Live web search
            └── Calculator        → Built-in math tool
    │
    ├── Check Agent Error  (IF node — catches runtime failures)
    ├── Normalize Response  (Set node → { "reply": "..." })
    └── Respond to Webhook  → { "reply": "..." }
```

**Stack:**
- **Backend**: n8n v2.x (Docker), GPT-4o, Tavily Search API
- **Frontend**: React + TypeScript + Tailwind CSS (built in Lovable AI)
- **Voice in**: Web Speech API (SpeechRecognition)
- **Voice out**: ElevenLabs streaming TTS or browser SpeechSynthesis

---

## Repo structure

```
├── n8n/
│   ├── JARVIS.patched.json     # Full n8n workflow export (import this)
│   ├── CHECKLIST.md            # Manual setup steps
│   └── TEST_PLAN.md            # curl test suite for every route
├── frontend/
│   └── src/
│       ├── components/
│       │   └── JarvisOrb.tsx           # Animated arc-reactor orb (SVG + canvas)
│       ├── hooks/
│       │   ├── useTTS.ts               # ElevenLabs + BrowserSpeechSynthesis
│       │   └── useSpeechRecognition.ts # Web Speech API hook
│       └── lib/
│           └── n8nClient.ts            # n8n webhook client
├── scripts/
│   └── start-jarvis.sh         # One-click local startup script
└── docker-compose.yml          # n8n Docker setup
```

---

## Local setup

### Prerequisites
- Docker Desktop running
- Node.js 18+
- OpenAI API key
- Tavily API key (free at tavily.com)

### 1 — Start n8n

```bash
cd n8n-docker   # or wherever your docker-compose.yml lives
docker compose up -d
```

n8n is configured with `restart: unless-stopped` so it auto-starts on every boot.

### 2 — Import the workflow

1. Open `http://localhost:5678`
2. Go to **Workflows → Import** → upload `n8n/JARVIS.patched.json`
3. Follow `n8n/CHECKLIST.md` to add your API keys

### 3 — Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — the JARVIS interface is live.

### Or use the startup script

```bash
bash scripts/start-jarvis.sh
```

---

## Security

- Webhook protected with a `X-JARVIS-Token` header (Header Auth credential in n8n)
- Session memory isolated per user via `sessionId` UUID (stored in localStorage)
- Input validation guard rejects empty/missing queries before the agent is invoked
- Runtime error branch prevents hanging webhook connections on agent failure
- No API keys hardcoded — all credentials stored in n8n's encrypted credential store

---

## Voice note

The original JARVIS voice (Paul Bettany / Marvel / Disney) is copyrighted. This project uses ElevenLabs **stock voices** only. Do not use voice clone models scraped from the Iron Man films.

---

## Built with

- [n8n](https://n8n.io) — workflow automation
- [OpenAI GPT-4o](https://openai.com) — language model
- [Tavily](https://tavily.com) — web search API
- [ElevenLabs](https://elevenlabs.io) — text-to-speech
- [Lovable](https://lovable.dev) — frontend AI builder

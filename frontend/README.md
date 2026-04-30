# JARVIS Interface

A voice-enabled Iron Man HUD web app that talks to the JARVIS n8n workflow.

---

## Quick Start

### 1. Configure settings

Open the app, click the ⚙ gear icon, and fill in:

| Setting | Value |
|---|---|
| **Webhook URL** | `http://localhost:5678/webhook/n8n` (or your production URL) |
| **Webhook Token** | The value from your `JARVIS-Webhook-Token` n8n credential (leave blank if you haven't configured auth yet) |
| **TTS Provider** | `ElevenLabs` (recommended) or `Browser` |
| **ElevenLabs API Key** | Your key from elevenlabs.io |
| **ElevenLabs Voice ID** | Default: `JBFqnCBsd6RMkjVDRZzb` (George — calm British male) |

All values are stored in `localStorage`. They are never sent to any server other than their respective endpoints (ElevenLabs key → ElevenLabs only, webhook token → your n8n only).

### 2. Run the app

```bash
cd web
npm install
npm run dev
```

Or paste the contents of `LOVABLE_PROMPT.md` into Lovable AI to scaffold and host the app automatically.

---

## Architecture

```
Browser
  ├── useSpeechRecognition  ← Web Speech API (STT)
  ├── n8nClient             ← POST to n8n webhook
  ├── useTTS                ← ElevenLabs or SpeechSynthesis (TTS)
  └── JarvisOrb             ← SVG + canvas, reacts to audio AnalyserNode
```

---

## ElevenLabs Voice Selection

The default voice ID (`JBFqnCBsd6RMkjVDRZzb`) is **George** — a stock ElevenLabs voice with a calm British male tone. You can swap to any other ElevenLabs stock voice by pasting its ID into settings.

Other suitable stock voices on ElevenLabs: Charlie (`IKne3meq5aSn9XLyUdCD`), Harry (`SOYHLrjzK2X1ezoPC6cr`).

To find IDs: `GET https://api.elevenlabs.io/v1/voices` with your API key.

---

## Voice Cloning — Legal Notice

**The original JARVIS voice (Paul Bettany) is copyrighted by Marvel/Disney and protected by Bettany's right of publicity.**

Do NOT:
- Use voice clone models of the JARVIS character from HuggingFace, Replicate, or similar — these are made from unlicensed scrapes of the films.
- Clone any actor's voice without their explicit written consent, regardless of the technical capability.
- Use any model marketed as "JARVIS voice" unless it comes with a valid license from Marvel/Disney and the performer.

Do:
- Use ElevenLabs stock voices (licensed for commercial use per their terms).
- Use voices you recorded yourself and own the rights to.
- Use the browser's built-in `SpeechSynthesis` API (system voices, no copyright issues).

This notice must be preserved in all forks and derivative projects.

---

## Webhook Payload Reference

```json
POST <webhookUrl>
X-JARVIS-Token: <token>
Content-Type: application/json

{
  "query": "What is the latest SpaceX news?",
  "sessionId": "a8f3d2c1-..."
}
```

Response:
```json
{ "reply": "According to recent reports..." }
```

Error response (HTTP 400):
```json
{ "error": true, "message": "body.query is required and must be a non-empty string" }
```

---

## Session Memory

Each browser generates a UUID on first load (stored as `jarvis_session_id` in localStorage). This ID is sent with every request so n8n's memory buffer stays isolated per user.

The **Clear Memory** button:
1. Removes `jarvis_history` from localStorage (clears the transcript panel).
2. TODO: Will also call `DELETE <webhookUrl>/session` once that endpoint is added to the n8n workflow.

---

## File Reference

```
web/
  src/
    components/JarvisOrb.tsx          — Animated orb (SVG + canvas)
    hooks/useTTS.ts                   — TTS abstraction (ElevenLabs + Browser)
    hooks/useSpeechRecognition.ts     — Web Speech API STT hook
    lib/n8nClient.ts                  — n8n webhook client + history
  LOVABLE_PROMPT.md                   — Paste into Lovable AI to scaffold the full app

n8n/
  JARVIS.patched.json                 — Hardened workflow (deployed)
  CHECKLIST.md                        — Manual steps still needed in n8n UI
  TEST_PLAN.md                        — curl/Postman test suite
```

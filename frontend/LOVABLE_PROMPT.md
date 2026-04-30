# JARVIS Interface — Lovable AI Project Prompt

Paste everything below the horizontal rule into Lovable's project creation prompt.

---

Build a single-page web application called **JARVIS** — a voice-enabled AI assistant interface styled after the Iron Man HUD. React + TypeScript + Tailwind CSS. No backend needed; all AI calls go to an external n8n webhook I will configure.

---

## Visual Design

**Color palette:**
- Background: `#050A0F` (near-black with deep navy undertone)
- Primary accent: `#00D4FF` (cyan)
- Secondary accent: `#FFB800` (gold)
- Surface: `rgba(0, 212, 255, 0.05)` (translucent cyan panels)
- Error/warning: `#FF6B35` (amber)
- Text primary: `#E8F4F8`
- Text muted: `#4A7A8A`

**Background:** The main canvas has a subtle hex-grid SVG pattern (thin `#00D4FF` lines at 5% opacity) over the dark background. Additionally, 3–4 large concentric rings centered on the viewport, `#00D4FF` at 3% opacity, give depth.

**Typography:**
- Headings / labels / node identifiers: `Orbitron` (Google Font) — all caps, letter-spacing wide
- Body text / transcript: `Inter` (Google Font)
- Active status line: cyan text glow using `text-shadow: 0 0 8px #00D4FF`

---

## Layout

Three-zone layout:

```
┌──────────────────────────────────────────────────┐
│  [JARVIS]            voice | text   [settings ⚙] │  ← top bar
├──────────────────┬───────────────┬───────────────┤
│                  │               │               │
│  TRANSCRIPT      │    ORB        │  SYSTEM       │
│  PANEL           │  (center)     │  STATUS       │
│  (left, 280px)   │               │  PANEL        │
│                  │  [input bar]  │  (right, 260px)│
│                  │               │               │
└──────────────────┴───────────────┴───────────────┘
```

- Left panel (Transcript History): scrollable list of conversation turns. Each turn has a "USER" or "JARVIS" label in Orbitron, the text in Inter. Thin `#00D4FF` left border. Collapses to a slide-out drawer on mobile.
- Center: the orb + a single text input field below it. The input has a thin cyan border with a subtle glow on focus, placeholder "QUERY //", and a microphone button on the right.
- Right panel (System Status): shows "CURRENT TASK", "LAST TOOL", "LATENCY (ms)", and "SESSION ID" in a monospaced readout style. Collapses to a bottom sheet on mobile.
- Top bar: app name on left, voice/text mode toggle in center, settings gear on right.

**Panels can be collapsed** via a chevron button on their inner edge. When collapsed they become a 40px-wide sliver with an icon.

**Mobile:** Both panels collapse by default; a bottom navigation bar shows two icon buttons to open them as bottom sheets.

---

## The Orb (Centerpiece)

An animated SVG + canvas orb, approximately 260px diameter on desktop.

**Structure (SVG base + canvas ring overlay):**
- SVG layer: arc reactor design — central solid circle (40px), 3 concentric thin rings at 60px / 90px / 130px radius, each with small tick marks at 45° intervals.
- Canvas overlay: a single reactive ring at 150px radius drawn via `requestAnimationFrame`. This ring reacts to audio amplitude.

**Four states — drive with a `orbState: 'idle' | 'listening' | 'thinking' | 'speaking'` prop:**

1. **idle** — SVG rings glow faint cyan (`opacity: 0.4`). Central circle pulses slowly (scale 0.97 → 1.03, 3s ease-in-out loop). Canvas ring: thin static circle.

2. **listening** — SVG rings glow brighter (`opacity: 0.9`, gold tint added). Central circle pulses faster (0.5s). Canvas ring: waveform-style ring driven by `AnalyserNode` byte data from the microphone — draw each frequency bin as a radial spike. Outer ring color: gold `#FFB800`.

3. **thinking** — SVG rings rotate (each ring at different speed: 4s, 7s, 11s, counter-rotating alternately). Canvas ring: rotating dashed arc, color cyan. Show "PROCESSING..." text below orb in Orbitron, blinking.

4. **speaking** — Canvas ring driven by `AnalyserNode` from the TTS audio output — amplitude-reactive radial spikes. SVG ring color: cyan. Show subtitle text below orb in a small Inter caption as the text being spoken (first 60 chars).

**Below the orb:** A single line of status text in Orbitron 11px all-caps. Examples: `// IDLE //`, `// LISTENING //`, `// PROCESSING //`, `// SPEAKING //`.

---

## Voice — Input (Speech to Text)

Use the browser's `SpeechRecognition` API (with `webkitSpeechRecognition` fallback).

- **Push-to-talk mode:** User holds the microphone button (space bar also triggers). On release, final transcript is submitted.
- **Always-listening mode:** A toggle switch in the top bar. When enabled, recognition runs continuously. A 1.5s silence after speech triggers submission.
- Show live interim transcript under the orb while the user is speaking (italic, muted color).
- On final transcript: set `orbState = 'thinking'`, POST to n8n webhook, await response, then set `orbState = 'speaking'` and trigger TTS. On completion: `orbState = 'idle'`.
- If `SpeechRecognition` is not available (Firefox, some mobile): hide mic button, show a small warning badge.

---

## Voice — Output (TTS)

**IMPORTANT LEGAL NOTE:** The original JARVIS voice (Paul Bettany, Marvel/Disney) is copyrighted. Do NOT use any voice clone model — only use legitimate TTS providers or stock library voices. See README.

Abstract a `TTSProvider` interface:
```typescript
interface TTSProvider {
  speak(text: string): Promise<void>;
  stop(): void;
  connectAnalyser(ctx: AudioContext, analyser: AnalyserNode): void;
  readonly name: string;
}
```

Implement two providers:

**Provider 1: ElevenLabsProvider**
- Uses the ElevenLabs streaming TTS endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream`
- Headers: `xi-api-key: <user's key>`, `Content-Type: application/json`
- Body: `{ "text": "...", "model_id": "eleven_multilingual_v2", "voice_settings": { "stability": 0.75, "similarity_boost": 0.75 } }`
- Stream the response into an `AudioContext` by reading chunks from `ReadableStream`, decoding with `AudioContext.decodeAudioData`, and queueing `AudioBufferSourceNode`s.
- Connect the audio graph through an `AnalyserNode` so the orb can react to amplitude.
- Default voice: George (`JBFqnCBsd6RMkjVDRZzb`) — a calm British male stock voice on ElevenLabs.

**Provider 2: BrowserSpeechSynthesisProvider**
- Uses `window.speechSynthesis`.
- On `speak()`: cancel any current utterance, create new `SpeechSynthesisUtterance`.
- Voice selection: call `speechSynthesis.getVoices()`, filter for `lang.startsWith('en-GB')` and `localService === true`. Prefer a voice whose name includes "Daniel" (macOS) or "Google UK English Male". Fall back to any `en-GB` voice, then any `en` voice.
- Settings: `rate = 0.93`, `pitch = 0.88`, `volume = 1`.
- Since `SpeechSynthesis` doesn't expose audio to `AnalyserNode`, use a fake amplitude animation (a sine wave) while speaking so the orb still reacts.

**Settings panel** (opens on gear icon): 
- Dropdown to pick TTS provider
- ElevenLabs API key (text input, stored in localStorage as `jarvis_elevenlabs_key`, never sent anywhere except ElevenLabs)
- ElevenLabs Voice ID (text input, default `JBFqnCBsd6RMkjVDRZzb`)
- n8n Webhook URL (text input, stored as `jarvis_webhook_url`)
- Save button — all values go to localStorage

---

## n8n Integration

On every query submission (voice or text):

```
POST <webhookUrl>
Content-Type: application/json
X-JARVIS-Token: <jarvis_webhook_token from settings>

{
  "query": "<user's text>",
  "sessionId": "<uuid stored in localStorage as jarvis_session_id>"
}
```

- `sessionId`: generate once on first load with `crypto.randomUUID()`, persist in `localStorage`.
- Read the response field `reply` from the JSON body: `response.reply`.
- If the HTTP status is not 2xx, or if parsing fails: set `orbState = 'error'` (orb turns amber), show the raw error in the status panel.
- Timeout: 60 seconds (LLM chains can be slow).

**Clear Memory button** (in settings panel or transcript panel footer):
- Clears `localStorage` key `jarvis_history`
- Shows a "// MEMORY CLEARED //" message in the status panel
- TODO: Also hit `DELETE <webhookUrl>/session` to reset n8n memory (endpoint to be added later)

---

## Conversation History

- Store in `localStorage` key `jarvis_history` as a JSON array of `{ role: 'user' | 'jarvis', text: string, timestamp: number }`.
- Cap at 50 entries (drop oldest when over).
- Display in the Transcript panel, newest at bottom.
- Each entry: small timestamp in top-right corner (HH:MM format), role label in Orbitron, text in Inter.

---

## Error State

When an error occurs:
- `orbState` transitions to a 5th CSS class `orb--error`: SVG rings glow amber `#FF6B35`, central circle pulses amber.
- Status panel shows: `STATUS: ERROR`, error message text.
- After 5 seconds, automatically returns to `idle`.

---

## Animations & Performance

- All ring animations via CSS `@keyframes` where possible (rotate, pulse).
- The canvas `requestAnimationFrame` loop only runs when state is `listening` or `speaking` — pause when idle/thinking to save CPU.
- Use `will-change: transform` on the rotating SVG elements.
- Prefer `transform` and `opacity` for all animations (GPU-accelerated).

---

## Mobile Responsiveness

- Below 768px: both panels hidden by default.
- Orb scales to 200px on mobile.
- Bottom bar with two icons: 💬 (transcript) and 📊 (status) — tap to open as bottom sheet.
- Input bar stays full-width at bottom.
- Push-to-talk button is large (60px touch target).

---

## File Structure (suggested)

```
src/
  components/
    JarvisOrb.tsx          — orb SVG + canvas + state machine
    TranscriptPanel.tsx    — scrollable conversation history
    StatusPanel.tsx        — system status readout
    SettingsModal.tsx      — settings form (webhook URL, keys)
    TopBar.tsx             — mode toggle, settings button
    InputBar.tsx           — text input + mic button
  hooks/
    useTTS.ts              — TTSProvider interface + two implementations
    useSpeechRecognition.ts — Web Speech API hook
  lib/
    n8nClient.ts           — fetch wrapper for n8n webhook
    storage.ts             — localStorage helpers
  App.tsx                  — layout + state orchestration
  index.css                — global styles, hex-grid bg, Orbitron font import
```

---

## Dependencies to add

- `@google-fonts/orbitron` via CSS `@import` (or use Fontsource)
- No additional npm packages needed for core functionality

---

## Initial State on First Load

- Orb: idle
- Transcript panel: shows one JARVIS message: `"Good day. I am JARVIS. How may I assist you?"`
- Settings modal: if `jarvis_webhook_url` is not set in localStorage, auto-open the settings modal with a prompt to configure the webhook URL.

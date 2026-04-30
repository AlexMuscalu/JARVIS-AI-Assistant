# Lovable integration prompt — paste this into the Lovable chat

---

Keep the existing UI, animations, JARVIS voice, and all styling completely unchanged.

I need to wire the "Talk to Jarvis" button and any voice/text input to a real n8n backend. Make only these specific changes:

## 1 — Create src/lib/jarvisApi.ts

```typescript
// Webhook URL and token are set in Lovable environment variables:
// VITE_WEBHOOK_URL and VITE_JARVIS_TOKEN
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL as string;
const TOKEN = import.meta.env.VITE_JARVIS_TOKEN as string;

function getSessionId(): string {
  let id = localStorage.getItem('jarvis_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('jarvis_session_id', id);
  }
  return id;
}

export async function askJarvis(query: string): Promise<string> {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-JARVIS-Token': TOKEN,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ query, sessionId: getSessionId() }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`JARVIS backend error: ${response.status}`);
  }

  const data = await response.json();
  return data.reply ?? data.output ?? 'No response received.';
}
```

## 2 — Wire it up

Find the component or hook that handles what happens when the user finishes speaking or submits text to JARVIS.

- Import `askJarvis` from `src/lib/jarvisApi.ts`
- When a query is ready (voice transcript finalised OR text submitted), call `const reply = await askJarvis(query)`
- Pass `reply` to whatever function currently handles JARVIS speaking back (the TTS / voice output system already in the project)
- While waiting for the response, set the orb/UI to a "thinking" or "processing" state if that state exists
- If the call throws an error, show it in the status display and keep the UI functional

## 3 — Do not change

- Any visual styling, colours, animations, or layout
- The existing voice system or TTS implementation
- The orb component or its states
- Any existing API calls or integrations already working

## 4 — Environment variables

Add to Lovable project settings (Settings → Environment Variables):
- `VITE_WEBHOOK_URL` = your ngrok webhook URL
- `VITE_JARVIS_TOKEN` = your auth token

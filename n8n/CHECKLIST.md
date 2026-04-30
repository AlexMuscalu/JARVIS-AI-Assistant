# JARVIS — Manual Configuration Checklist

These items require action in the n8n UI and cannot be patched via JSON import.

---

## 1. Tavily API Key (S4 — CRITICAL)

The Tavily node currently has `"REPLACE_WITH_TAVILY_KEY"` as a placeholder.
Pick one of these approaches:

**Option A — n8n Credential (recommended)**
1. In n8n UI: Settings → Credentials → Add Credential → **Header Auth**
2. Name it `Tavily-API-Key`
3. Header Name: `Authorization`, Header Value: `Bearer <your-tavily-key>`
4. Open the **Tavily** node in the JARVIS workflow
5. Switch from "Specify Body as JSON" to use the **Authentication** field → select your new credential
6. Remove `api_key` from the JSON body (Tavily accepts `Authorization: Bearer <key>` header)

**Option B — n8n Environment Variable**
1. Stop your n8n Docker container
2. Edit `docker-compose.yml` to add `N8N_TAVILY_API_KEY=<your-key>` under `environment:`
3. Restart the container
4. In the Tavily node's JSON body, change the `api_key` value to: `{{ $env.N8N_TAVILY_API_KEY }}`

---

## 2. Webhook Authentication (S1 — CRITICAL)

The webhook at `/webhook/n8n` is currently open to anyone.

1. Open the **Webhook** node in n8n UI
2. Set **Authentication** → **Header Auth**
3. Create a new credential named `JARVIS-Webhook-Token`
   - Header Name: `X-JARVIS-Token`
   - Header Value: generate a long random string (e.g. `openssl rand -hex 32`)
4. Save and note the token value — the frontend will send this header with every request
5. Update your frontend `.env` / Lovable settings with the token value

---

## 3. Global Error Handler (S6 — MAJOR)

1. In the JARVIS workflow canvas, add a new **Error Trigger** node (from the trigger section)
2. Connect it to a new **Respond to Webhook** node named "Global Error Response"
3. Configure "Global Error Response" with:
   - Respond With: JSON
   - Response Body: `{ "error": true, "message": "An internal error occurred. Please try again." }`
   - Response Code: 500
4. This node will catch any unhandled runtime errors across the workflow

---

## 4. Verify Child Workflow IDs (S5)

The patched JSON wires these IDs — confirm they open the correct sub-workflows in n8n:

| Agent | Workflow ID | Expected name |
|---|---|---|
| Email Agent | `7L00fcqqoqPG7nIj` | Email Agent |
| Calendar Agent | `GNmmQ5T7fz4pG0Da` | Calendar Agent |
| Contact Agent | `8yxf7wIezTCZMjeY` | Contact Agent |
| Content Creator | `fgb3lhoyzGg1vmLa` | Content Creation Agent |

In n8n UI: click each child agent tool node → the workflow selector should show the correct name.
If any are wrong, click the selector and re-pick the correct sub-workflow.

---

## 5. Workflow is Already Active

The patched workflow was deployed in active state (`active: true`).
Confirm the webhook is live by hitting: `GET http://localhost:5678/webhook-test/n8n` (test URL) or the production URL.

---

## Done ✓ (Applied automatically via JARVIS.patched.json)

- [x] Session key — now uses `body.sessionId` (falls back to `headers.host`)
- [x] Input validation guard — Code node + IF node before Jarvis
- [x] Response normalization — Set node locks response to `{ "reply": "..." }`
- [x] Child workflow IDs — all 4 wired in
- [x] Calculator added to system prompt tool list

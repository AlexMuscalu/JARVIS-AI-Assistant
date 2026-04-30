# JARVIS — Webhook Test Plan

Base URL: `http://localhost:5678/webhook/n8n`  
Replace `<TOKEN>` with the value from your `JARVIS-Webhook-Token` credential.  
All requests: `Content-Type: application/json`, `X-JARVIS-Token: <TOKEN>`

---

## Test 1 — Pure Chat (no tool)
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"Who are you and what can you do?","sessionId":"test-001"}'
```
**Expected behavior:** Jarvis replies conversationally — no tool called.  
**Healthy response:** `{"reply":"I am JARVIS, your personal assistant. I can send emails, manage your calendar, look up contacts, create blog posts, search the web, and perform calculations..."}`

---

## Test 2 — Web Search (Tavily)
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"What is the latest news about SpaceX today?","sessionId":"test-001"}'
```
**Expected behavior:** Tavily tool is called with `searchTerm = "SpaceX latest news"`.  
**Healthy response:** `{"reply":"According to recent reports, SpaceX has..."}`  
**Check in n8n:** Tavily node shows a successful POST to `api.tavily.com/search`.

---

## Test 3 — Calculator
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"What is 2847 multiplied by 93?","sessionId":"test-001"}'
```
**Expected behavior:** Calculator tool is called.  
**Healthy response:** `{"reply":"2,847 × 93 = 264,771."}`

---

## Test 4 — Email (requires contactAgent → emailAgent chain)
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"Email Nate asking if he is free this Friday","sessionId":"test-001"}'
```
**Expected behavior:** Jarvis first calls `contactAgent` to resolve Nate's email, then calls `emailAgent` with the resolved address.  
**Healthy response:** `{"reply":"Done. I've sent an email to Nate asking if he is free this Friday."}`  
**Check in n8n:** Two tool invocations visible in the Jarvis node execution trace.

---

## Test 5 — Calendar Create
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"Schedule a team standup for tomorrow at 9am","sessionId":"test-002"}'
```
**Expected behavior:** `calendarAgent` is called directly (no contact lookup needed for no-attendee event).  
**Healthy response:** `{"reply":"Done. I've created a team standup event for tomorrow at 9:00 AM."}`

---

## Test 6 — Contact Lookup
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"What is Nate Herkelman'\''s email address?","sessionId":"test-002"}'
```
**Expected behavior:** `contactAgent` is called.  
**Healthy response:** `{"reply":"Nate Herkelman's email address is nate@example.com."}`

---

## Test 7 — Blog Post (Content Creator)
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"Write a short blog post about the future of AI voice assistants","sessionId":"test-003"}'
```
**Expected behavior:** `contentCreator` is called.  
**Healthy response:** `{"reply":"Here is your blog post: **The Future of AI Voice Assistants**\n\n..."}`

---

## Test 8 — Multi-Tool Chain (contact + email, end-to-end)
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"Email Nate Herkelman asking when he wants to leave for the airport","sessionId":"test-004"}'
```
**Expected behavior:** contactAgent resolves Nate's email → emailAgent sends the message.  
**Healthy response:** `{"reply":"Email sent to Nate Herkelman at [his email] asking about his airport departure time."}`  
**This is the golden-path multi-tool test — run it last.**

---

## Test VAL — Input Validation Guard
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"","sessionId":"test-val"}'
```
**Expected behavior:** "Validate Input" Code node returns error, "Check Validation" IF node routes to "Respond with Error".  
**Healthy response (HTTP 400):** `{"error":true,"message":"body.query is required and must be a non-empty string"}`

Also test with missing query field entirely:
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"sessionId":"test-val"}'
```
Same 400 response expected.

---

## Test AUTH — Webhook Token Check
```bash
# Missing token
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{"query":"Hello","sessionId":"test-auth"}'

# Wrong token
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: wrongtoken" \
  -d '{"query":"Hello","sessionId":"test-auth"}'
```
**Expected behavior (after completing CHECKLIST item #2):** Both return HTTP 401.  
*Note: Until webhook auth is configured in the UI, these will still process normally.*

---

## Test MEM — Session Memory Isolation
Run these two requests in order on the same `sessionId`:
```bash
# Turn 1
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"My name is Alex and I prefer short responses","sessionId":"mem-test-001"}'

# Turn 2
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"What is my name?","sessionId":"mem-test-001"}'
```
**Expected:** Turn 2 answers "Alex" — session memory is working.

Then run with a different sessionId:
```bash
curl -s -X POST http://localhost:5678/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-JARVIS-Token: <TOKEN>" \
  -d '{"query":"What is my name?","sessionId":"mem-test-002"}'
```
**Expected:** Jarvis does not know the name — session isolation is working.

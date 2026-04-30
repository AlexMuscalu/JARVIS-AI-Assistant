const TIMEOUT_MS = 60_000;
const HISTORY_KEY = 'jarvis_history';
const SESSION_KEY = 'jarvis_session_id';
const MAX_HISTORY = 50;

export interface ConversationEntry {
  role: 'user' | 'jarvis';
  text: string;
  timestamp: number;
}

export interface JarvisResponse {
  reply: string;
}

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getConfig(): { webhookUrl: string; webhookToken: string } {
  return {
    webhookUrl: localStorage.getItem('jarvis_webhook_url') ?? '',
    webhookToken: localStorage.getItem('jarvis_webhook_token') ?? '',
  };
}

export async function askJarvis(query: string): Promise<JarvisResponse> {
  const { webhookUrl, webhookToken } = getConfig();
  if (!webhookUrl) throw new Error('JARVIS webhook URL is not configured. Open Settings to set it.');

  const sessionId = getSessionId();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (webhookToken) headers['X-JARVIS-Token'] = webhookToken;

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, sessionId }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out after 60 seconds.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`JARVIS returned ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();

  // Accept either 'reply' or 'output' for forward compat
  const reply: string = data.reply ?? data.output ?? JSON.stringify(data);

  return { reply };
}

export function getHistory(): ConversationEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function appendHistory(entry: ConversationEntry): void {
  const history = getHistory();
  history.push(entry);
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
  // TODO: Also hit DELETE <webhookUrl>/session to reset n8n conversation memory
  // Example:
  //   const { webhookUrl, webhookToken } = getConfig();
  //   await fetch(`${webhookUrl}/session`, { method: 'DELETE', headers: { 'X-JARVIS-Token': webhookToken } });
}

// Pre-seeds webhook config into localStorage on first load.
// Values only written if not already set, so the user can override from settings.
// Secrets are injected at build time via VITE_ env vars — never hardcoded here.
export function initConfig() {
  if (!localStorage.getItem('jarvis_webhook_url')) {
    const url = import.meta.env.VITE_WEBHOOK_URL ?? '';
    if (url) localStorage.setItem('jarvis_webhook_url', url);
  }
  if (!localStorage.getItem('jarvis_webhook_token')) {
    const token = import.meta.env.VITE_JARVIS_TOKEN ?? '';
    if (token) localStorage.setItem('jarvis_webhook_token', token);
  }
  if (!localStorage.getItem('jarvis_session_id')) {
    localStorage.setItem('jarvis_session_id', crypto.randomUUID());
  }
}

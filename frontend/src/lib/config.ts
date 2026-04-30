// Pre-seeds webhook config into localStorage on first load.
// Values only written if not already set, so the user can override from settings.
export function initConfig() {
  if (!localStorage.getItem('jarvis_webhook_url')) {
    localStorage.setItem('jarvis_webhook_url', 'http://localhost:5678/webhook/n8n');
  }
  if (!localStorage.getItem('jarvis_webhook_token')) {
    localStorage.setItem('jarvis_webhook_token', '35dfeab43a62995965c1a2f3a3ebaf2c85f130593992ba47');
  }
  if (!localStorage.getItem('jarvis_session_id')) {
    localStorage.setItem('jarvis_session_id', crypto.randomUUID());
  }
}

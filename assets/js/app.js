(() => {
  const form = document.getElementById('fcm-form');
  if (!form) return;

  const $ = (id) => document.getElementById(id);
  const credentials = $('serviceAccount');
  const fileInput = $('serviceAccountFile');
  const fileState = $('fileState');
  const deviceToken = $('deviceToken');
  const title = $('notificationTitle');
  const message = $('notificationMessage');
  const data = $('customData');
  const sendButton = $('sendButton');
  const result = $('result');
  const resultTitle = $('resultTitle');
  const resultText = $('resultText');
  const toast = $('toast');
  const endpoint = window.PUSHCRAFT_CONFIG?.apiEndpoint || '/api/send';

  function toastMessage(text, type = '') {
    if (!toast) return;
    toast.textContent = text;
    toast.className = `toast show ${type}`.trim();
    clearTimeout(toastMessage.timer);
    toastMessage.timer = setTimeout(() => { toast.className = 'toast'; }, 2800);
  }

  function parseServiceAccount() {
    const raw = credentials.value.trim();
    if (!raw) throw new Error('Add your Firebase service account JSON.');
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error('The service account JSON is not valid JSON.'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The service account JSON must be an object.');
    const required = ['project_id', 'client_email', 'private_key'];
    const missing = required.filter((key) => !parsed[key] || typeof parsed[key] !== 'string');
    if (missing.length) throw new Error(`Service account JSON is missing: ${missing.join(', ')}.`);
    return parsed;
  }

  function parseCustomData() {
    const raw = data.value.trim();
    if (!raw) return undefined;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error('Custom data must be valid JSON.'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Custom data must be a JSON object.');
    const output = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!key.trim()) throw new Error('Custom data keys cannot be empty.');
      output[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return output;
  }

  function showResult(ok, heading, detail) {
    result.hidden = false;
    result.className = `result ${ok ? 'success' : 'error'}`;
    resultTitle.textContent = heading;
    resultText.textContent = detail;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      fileInput.value = '';
      toastMessage('Choose a .json service account file.', 'error');
      return;
    }
    if (file.size > 128 * 1024) {
      fileInput.value = '';
      toastMessage('The JSON file is unexpectedly large.', 'error');
      return;
    }
    try {
      const text = await file.text();
      JSON.parse(text);
      credentials.value = text;
      fileState.textContent = file.name;
      fileState.classList.add('loaded');
      toastMessage('Service account JSON loaded.', 'success');
    } catch {
      fileInput.value = '';
      fileState.textContent = 'No file selected';
      fileState.classList.remove('loaded');
      toastMessage('That file is not valid JSON.', 'error');
    }
  });

  credentials.addEventListener('input', () => {
    if (!credentials.value.trim()) {
      fileInput.value = '';
      fileState.textContent = 'No file selected';
      fileState.classList.remove('loaded');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    result.hidden = true;

    let serviceAccount;
    let customData;
    try {
      serviceAccount = parseServiceAccount();
      customData = parseCustomData();
    } catch (error) {
      toastMessage(error.message, 'error');
      return;
    }

    const token = deviceToken.value.trim();
    const notificationTitle = title.value.trim();
    const notificationMessage = message.value.trim();

    if (!token) return toastMessage('Enter the device token.', 'error');
    if (!notificationTitle && !notificationMessage && !customData) {
      return toastMessage('Add a title, message, or custom data.', 'error');
    }

    sendButton.disabled = true;
    sendButton.classList.add('is-sending');
    const buttonLabel = sendButton.querySelector('.button-label');
    if (buttonLabel) buttonLabel.textContent = 'Sending...';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccount,
          deviceToken: token,
          title: notificationTitle,
          message: notificationMessage,
          data: customData
        })
      });

      const payload = await response.json().catch(() => ({ error: 'The server returned an unreadable response.' }));
      if (!response.ok) {
        const errorText = payload?.error?.message || payload?.error || 'Firebase rejected the notification.';
        showResult(false, 'Notification not sent', String(errorText));
        toastMessage('Notification failed.', 'error');
        return;
      }

      const id = payload?.name || payload?.messageId || 'Accepted by Firebase Cloud Messaging.';
      showResult(true, 'Notification sent', id);
      toastMessage('Notification sent successfully.', 'success');
    } catch (error) {
      showResult(false, 'Unable to send notification', error.message || 'Check your connection and try again.');
      toastMessage('Unable to reach the send service.', 'error');
    } finally {
      sendButton.disabled = false;
      sendButton.classList.remove('is-sending');
      const buttonLabel = sendButton.querySelector('.button-label');
      if (buttonLabel) buttonLabel.textContent = 'Send Notification';
    }
  });
})();

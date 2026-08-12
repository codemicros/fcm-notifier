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
  const payloadPreview = $('payloadPreview');
  const sendButton = $('sendButton');
  const result = $('result');
  const resultTitle = $('resultTitle');
  const resultText = $('resultText');
  const toast = $('toast');

  const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
  const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

  function base64url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64urlFromString(text) {
    return base64url(new TextEncoder().encode(text));
  }

  async function importPrivateKey(pem) {
    const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    try {
      return await crypto.subtle.importKey('pkcs8', bytes.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    } catch {
      throw new Error('The service account private_key could not be read. Re-download the JSON from Firebase.');
    }
  }

  // Signs a JWT and exchanges it for an FCM access token entirely in the browser,
  // so the private key never leaves this page.
  async function mintAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64urlFromString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = base64urlFromString(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: FCM_SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: now,
      exp: now + 3600
    }));
    const unsigned = `${header}.${claim}`;
    const key = await importPrivateKey(serviceAccount.private_key);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
    const jwt = `${unsigned}.${base64url(new Uint8Array(signature))}`;

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token) {
      throw new Error(payload?.error_description || payload?.error || 'Could not authenticate the Firebase service account.');
    }
    return payload.access_token;
  }

  function firebaseErrorMessage(payload, status) {
    const code = payload?.error?.status || '';
    const message = payload?.error?.message || '';
    if (code === 'UNAUTHENTICATED') return 'Firebase could not authenticate this service account. Check the JSON key and its permissions.';
    if (code === 'PERMISSION_DENIED') return 'This service account is not allowed to send FCM messages for this Firebase project.';
    if (code === 'NOT_FOUND') return 'Firebase could not find the requested project or registration.';
    if (code === 'INVALID_ARGUMENT') return message || 'Firebase rejected the device token or message payload.';
    return message || `Firebase returned HTTP ${status}.`;
  }

  async function sendFcmMessage(serviceAccount, message) {
    const accessToken = await mintAccessToken(serviceAccount);
    const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount.project_id)}/messages:send`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(firebaseErrorMessage(payload, response.status));
      error.rejectedByFirebase = true;
      throw error;
    }
    return payload;
  }

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
    if (!parsed.client_email.includes('@')) throw new Error('The service account client_email looks invalid.');
    if (!parsed.private_key.includes('BEGIN PRIVATE KEY') || !parsed.private_key.includes('END PRIVATE KEY')) {
      throw new Error('The service account private_key looks invalid.');
    }
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

  function buildFcmMessage(token, notificationTitle, notificationMessage, customData) {
    const fcmMessage = { token };
    if (notificationTitle || notificationMessage) {
      fcmMessage.notification = {};
      if (notificationTitle) fcmMessage.notification.title = notificationTitle;
      if (notificationMessage) fcmMessage.notification.body = notificationMessage;
    }
    if (customData) fcmMessage.data = customData;
    return fcmMessage;
  }

  function refreshPayloadPreview() {
    if (!payloadPreview) return;
    let previewData;
    try { previewData = parseCustomData(); } catch { previewData = undefined; }
    const fcmMessage = buildFcmMessage(
      deviceToken.value.trim() || '<your-device-token>',
      title.value.trim(),
      message.value.trim(),
      previewData
    );
    payloadPreview.textContent = JSON.stringify({ message: fcmMessage }, null, 2);
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

  [deviceToken, title, message, data].forEach((el) => el.addEventListener('input', refreshPayloadPreview));
  refreshPayloadPreview();

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

    const fcmMessage = buildFcmMessage(token, notificationTitle, notificationMessage, customData);

    try {
      const payload = await sendFcmMessage(serviceAccount, fcmMessage);
      const id = payload?.name || 'Accepted by Firebase Cloud Messaging.';
      showResult(true, 'Notification sent', id);
      toastMessage('Notification sent successfully.', 'success');
    } catch (error) {
      if (error.rejectedByFirebase) {
        showResult(false, 'Notification not sent', error.message);
        toastMessage('Notification failed.', 'error');
      } else {
        showResult(false, 'Unable to send notification', error.message || 'Check your connection and try again.');
        toastMessage('Unable to reach Firebase.', 'error');
      }
    } finally {
      sendButton.disabled = false;
      sendButton.classList.remove('is-sending');
      const buttonLabel = sendButton.querySelector('.button-label');
      if (buttonLabel) buttonLabel.textContent = 'Send Notification';
    }
  });
})();

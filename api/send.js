import crypto from 'node:crypto';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const MAX_BODY_BYTES = 160 * 1024;
const MAX_TOKEN_LENGTH = 8192;
const PROJECT_ID_RE = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/i;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function allowedOrigin(req) {
  const origin = String(req.headers?.origin || '').trim();
  if (!origin) return '';

  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.length) return configured.includes(origin) ? origin : null;

  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').trim();
  if (!host) return null;
  const proto = String(req.headers?.['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim();
  const sameOrigin = `${proto}://${host}`;
  return origin === sameOrigin ? origin : null;
}

function setCors(req, res) {
  const origin = allowedOrigin(req);
  if (origin === null) return false;
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return true;
}

function validateServiceAccount(value) {
  let account = value;
  if (typeof account === 'string') {
    try { account = JSON.parse(account); } catch { throw new Error('Service account JSON is invalid.'); }
  }
  if (!account || typeof account !== 'object' || Array.isArray(account)) throw new Error('Service account JSON is required.');

  const projectId = typeof account.project_id === 'string' ? account.project_id.trim() : '';
  const clientEmail = typeof account.client_email === 'string' ? account.client_email.trim() : '';
  const privateKey = typeof account.private_key === 'string' ? account.private_key : '';

  if (!projectId || !PROJECT_ID_RE.test(projectId)) throw new Error('The service account contains an invalid project_id.');
  if (!clientEmail || !clientEmail.includes('@')) throw new Error('The service account contains an invalid client_email.');
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) throw new Error('The service account contains an invalid private_key.');
  if (privateKey.length > 20000) throw new Error('The service account private key is unexpectedly large.');

  return { projectId, clientEmail, privateKey };
}

function createJwt({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: clientEmail,
    scope: FCM_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function mintAccessToken(account) {
  const assertion = createJwt(account);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { error_description: text }; }
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Could not authenticate the Firebase service account.');
  }
  return payload.access_token;
}

function normalizeData(value) {
  if (value == null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Custom data must be a JSON object.');
  const entries = Object.entries(value);
  if (!entries.length) return undefined;
  if (entries.length > 100) throw new Error('Custom data contains too many fields.');

  const data = {};
  for (const [key, rawValue] of entries) {
    const cleanKey = String(key).trim();
    if (!cleanKey || cleanKey.length > 128) throw new Error('Custom data contains an invalid key.');
    const cleanValue = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
    if (cleanValue.length > 4096) throw new Error(`Custom data value for "${cleanKey}" is too large.`);
    data[cleanKey] = cleanValue;
  }
  return data;
}

function buildMessage(body) {
  const deviceToken = typeof body.deviceToken === 'string' ? body.deviceToken.trim() : '';
  if (!deviceToken || deviceToken.length > MAX_TOKEN_LENGTH) throw new Error('A valid FCM device token is required.');

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const messageText = typeof body.message === 'string' ? body.message.trim() : '';
  const data = normalizeData(body.data);
  if (title.length > 180) throw new Error('Notification title is too long.');
  if (messageText.length > 2000) throw new Error('Notification message is too long.');
  if (!title && !messageText && !data) throw new Error('Add a notification title, message, or custom data.');

  const message = { token: deviceToken };
  if (title || messageText) {
    message.notification = {};
    if (title) message.notification.title = title;
    if (messageText) message.notification.body = messageText;
  }
  if (data) message.data = data;
  return message;
}

function upstreamError(payload, status) {
  const code = payload?.error?.status || '';
  const message = payload?.error?.message || '';
  if (code === 'UNAUTHENTICATED') return 'Firebase could not authenticate this service account. Check the JSON key and its permissions.';
  if (code === 'PERMISSION_DENIED') return 'This service account is not allowed to send FCM messages for this Firebase project.';
  if (code === 'NOT_FOUND') return 'Firebase could not find the requested project or registration.';
  if (code === 'INVALID_ARGUMENT') return message || 'Firebase rejected the device token or message payload.';
  return message || `Firebase returned HTTP ${status}.`;
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCors(req, res)) return res.status(403).json({ error: 'Origin not allowed.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const body = req.body || {};
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'Request is too large.' });
    }

    const account = validateServiceAccount(body.serviceAccount);
    const message = buildMessage(body);
    const accessToken = await mintAccessToken(account);

    const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.projectId)}/messages:send`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ message })
    });

    const text = await upstream.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
    if (!upstream.ok) return res.status(upstream.status).json({ error: upstreamError(payload, upstream.status), firebase: payload });

    return res.status(200).json({ name: payload.name || '', messageId: payload.name || '' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to send the notification.' });
  }
}

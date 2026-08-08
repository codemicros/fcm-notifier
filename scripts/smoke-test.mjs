import crypto from 'node:crypto';
import handler from '../api/send.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

const calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  if (String(url) === 'https://oauth2.googleapis.com/token') {
    return new Response(JSON.stringify({ access_token: 'test-access-token', expires_in: 3600, token_type: 'Bearer' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('fcm.googleapis.com')) {
    return new Response(JSON.stringify({ name: 'projects/demo-project/messages/12345' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

const req = {
  method: 'POST',
  headers: { host: 'localhost:4173', origin: 'http://localhost:4173' },
  body: {
    serviceAccount: {
      type: 'service_account',
      project_id: 'demo-project',
      client_email: 'firebase-adminsdk@example.iam.gserviceaccount.com',
      private_key: privatePem
    },
    deviceToken: 'device-registration-token',
    title: 'Hello',
    message: 'Test message',
    data: { screen: 'home', count: 3 }
  }
};
const res = mockResponse();
await handler(req, res);
if (res.statusCode !== 200) throw new Error(`Expected 200, received ${res.statusCode}: ${JSON.stringify(res.body)}`);
if (calls.length !== 2) throw new Error(`Expected two upstream requests, received ${calls.length}`);
if (calls[0].url !== 'https://oauth2.googleapis.com/token') throw new Error('OAuth token endpoint mismatch.');
if (!calls[1].url.endsWith('/v1/projects/demo-project/messages:send')) throw new Error('FCM endpoint mismatch.');
const payload = JSON.parse(calls[1].options.body);
if (payload.message.token !== 'device-registration-token') throw new Error('Device token missing from FCM payload.');
if (payload.message.notification.title !== 'Hello') throw new Error('Notification title missing.');
if (payload.message.data.count !== '3') throw new Error('Custom data was not normalized to a string.');
if (JSON.stringify(res.body).includes('PRIVATE KEY')) throw new Error('Private key leaked into API response.');
console.log('Smoke test passed: OAuth minting and FCM payload flow are wired correctly.');

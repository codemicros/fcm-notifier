import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sendHandler from './api/send.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function apiResponse(res) {
  return {
    setHeader: (key, value) => res.setHeader(key, value),
    status(code) { res.statusCode = code; return this; },
    json(value) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); },
    end() { res.end(); }
  };
}

const server = http.createServer(async (req, res) => {
  if ((req.url || '').split('?')[0] === '/api/send') {
    if (req.method !== 'POST' && req.method !== 'OPTIONS') return sendHandler(req, apiResponse(res));
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 200000) req.destroy();
    });
    req.on('end', async () => {
      try { req.body = JSON.parse(raw || '{}'); }
      catch { return apiResponse(res).status(400).json({ error: 'Request body must be valid JSON.' }); }
      await sendHandler(req, apiResponse(res));
    });
    return;
  }

  try {
    const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(root, cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\//, ''));
    const info = await stat(file).catch(() => null);
    if (info?.isDirectory()) file = path.join(file, 'index.html');
    const content = await readFile(file);
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(content);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(await readFile(path.join(root, '404.html')));
  }
});

server.listen(port, () => console.log(`FCM Notification Tester running at http://localhost:${port}`));

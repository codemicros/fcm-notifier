import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function normalizeUrl(raw) {
  if (!raw) return '';
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return value.replace(/\/$/, '');
}

const siteUrl = normalizeUrl(
  process.env.SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://fcmnotifier.codemicros.com'
);
const verification = String(process.env.GOOGLE_SITE_VERIFICATION || '').trim().replace(/["<>]/g, '');
const apiEndpoint = process.env.FCM_RELAY_URL || '/api/send';
const adsensePublisherId = process.env.ADSENSE_PUBLISHER_ID || 'pub-4306028074375583';
const adsenseClient = process.env.ADSENSE_CLIENT || 'ca-pub-4306028074375583';
const adsenseSlotTop = process.env.ADSENSE_SLOT_TOP || '5842001493';

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const replacements = new Map([
  ['{{SITE_URL}}', siteUrl],
  ['<!--GOOGLE_SITE_VERIFICATION-->', verification ? `<meta name="google-site-verification" content="${verification}">` : '']
]);

function transformText(text) {
  let output = text;
  for (const [from, to] of replacements) output = output.split(from).join(to);
  return output;
}

function copyTree(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) copyTree(source, target);
    else {
      let content = fs.readFileSync(source);
      if (/\.(html|css|js|json|svg|txt|xml)$/i.test(entry.name)) content = Buffer.from(transformText(content.toString('utf8')));
      fs.writeFileSync(target, content);
    }
  }
}

for (const file of ['index.html', 'docs.html', 'about.html', 'privacy.html', 'security.html', 'terms.html', '404.html', 'favicon.svg', 'favicon.ico', 'site.webmanifest', 'llms.txt']) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) continue;
  let content = fs.readFileSync(source);
  if (/\.(html|svg|txt)$/i.test(file)) content = Buffer.from(transformText(content.toString('utf8')));
  fs.writeFileSync(path.join(dist, file), content);
}
copyTree(path.join(root, 'assets'), path.join(dist, 'assets'));
copyTree(path.join(root, 'guides'), path.join(dist, 'guides'));

const runtimeConfig = `window.PUSHCRAFT_CONFIG = ${JSON.stringify({
  siteName: 'FCM Notification Tester',
  siteUrl,
  apiEndpoint,
  adsense: {
    client: adsenseClient,
    slots: {
      top: adsenseSlotTop,
      middle: process.env.ADSENSE_SLOT_MIDDLE || '',
      footer: process.env.ADSENSE_SLOT_FOOTER || ''
    }
  }
}, null, 2)};\n`;
fs.writeFileSync(path.join(dist, 'assets/js/config.js'), runtimeConfig);

if (process.env.VERCEL_ENV === 'preview') {
  const htmlFiles = [];
  const collect = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  };
  collect(dist);
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8').replace(/<meta name="robots" content="[^"]*">/i, '<meta name="robots" content="noindex,nofollow">');
    fs.writeFileSync(file, html);
  }
}

const guideFiles = fs.readdirSync(path.join(root, 'guides'))
  .filter((name) => name.endsWith('.html'))
  .sort()
  .map((name) => `/guides/${name}`);

const indexed = [
  '/',
  '/docs.html',
  '/about.html',
  ...guideFiles
];
const lastmod = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map((url) => `  <url><loc>${siteUrl}${url}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

fs.writeFileSync(path.join(dist, 'ads.txt'), `google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`);

console.log(`Built FCM Notification Tester for ${siteUrl}`);

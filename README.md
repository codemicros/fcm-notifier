# FCM Notification Tester — FCM Notification Tester

A deliberately simple Firebase Cloud Messaging HTTP v1 notification tester.

## The user flow

1. Upload a Firebase service account JSON file **or** paste the JSON.
2. Paste an FCM device registration token.
3. Enter a notification title.
4. Enter a message.
5. Optionally enter a JSON custom-data object.
6. Click **Send Notification**.

There are no OAuth token fields, project-ID fields, topic selectors, cURL builders, payload previews, or advanced platform controls in the tester UI.

## Requirements

- Node.js 20+
- A Firebase project with FCM enabled
- An authorized Firebase/Google Cloud service account JSON private key
- A current FCM device registration token

## Run locally

```bash
npm run check
npm test
npm run dev
```

Open `http://localhost:4173`.

`npm test` uses an ephemeral RSA key and mocked Google/Firebase responses. It does not contact Firebase or use real credentials.

## How sending works

The browser sends the service account JSON and notification fields to `/api/send` over HTTPS. The endpoint:

1. Validates the service-account fields and FCM message inputs.
2. Signs a JWT with the supplied RSA private key.
3. Exchanges that assertion at `https://oauth2.googleapis.com/token` for a short-lived access token using the Firebase Messaging scope.
4. Sends the message to `https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`.
5. Returns only the send result. The application code does not write the supplied private key to a file, localStorage, cookies, or a database.

The token endpoint is hardcoded to Google's OAuth endpoint; the service-account JSON cannot redirect the backend to an arbitrary token URL.

## Deploy to Vercel

Vercel is recommended because the project includes the serverless `/api/send.js` endpoint.

1. Push this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Add the production environment variables below.
4. Deploy.
5. Attach your custom domain.

### Production environment variables

```text
SITE_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
GOOGLE_SITE_VERIFICATION=your-search-console-verification-token
```

`SITE_URL` is used for canonical URLs, Open Graph URLs, `robots.txt`, and `sitemap.xml`. This means you do not have to manually edit every page when you choose a domain.

### AdSense environment variables

```text
ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
ADSENSE_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX
ADSENSE_SLOT_TOP=1234567890
ADSENSE_SLOT_MIDDLE=1234567890
ADSENSE_SLOT_FOOTER=1234567890
```

Empty values keep ads completely hidden. The build also generates `ads.txt` from `ADSENSE_PUBLISHER_ID`.

## SEO

See [SEO.md](SEO.md). The production build includes:

- focused titles and meta descriptions
- canonical URLs
- index/noindex decisions by page type
- XML sitemap and robots.txt
- WebSite and SoftwareApplication structured data on the tool page
- crawlable internal links
- focused long-tail FCM guide pages
- Open Graph/Twitter metadata
- Google Search Console verification via environment variable
- preview-deployment `noindex` behavior on Vercel

## Security

A Firebase service account JSON file contains a private key. This project processes it because the intended testing workflow explicitly requires JSON upload/paste authentication. Use the tool only with credentials you are authorized to use.

For a public deployment:

- use HTTPS only
- set `ALLOWED_ORIGINS`
- use a dedicated least-privilege service account where practical
- never log request bodies in middleware or hosting instrumentation
- do not add session replay/analytics that capture form fields
- never commit a real service account JSON file to Git
- rotate a key if you suspect exposure

Google recommends avoiding user-managed service-account keys when a stronger managed identity option is available. This tool is intended for interactive testing, not as a credential-management pattern for production application servers.

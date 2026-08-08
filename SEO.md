# SEO Strategy

## Primary search intent

The homepage is built around one intent: a developer wants to quickly send a Firebase Cloud Messaging test notification to a device.

### Primary keyword cluster

- FCM notification tester
- Firebase notification tester
- Firebase push notification tester
- FCM tester
- FCM tester online
- test FCM notification online
- test Firebase notification
- test Firebase push notification
- push notification tester
- Firebase Cloud Messaging tester
- FCM push notification tester

### Secondary / long-tail cluster

- FCM HTTP v1 tester
- Firebase HTTP v1 notification tester
- send FCM notification online
- send Firebase notification to device token
- test FCM device token
- Firebase service account JSON FCM
- how to test Firebase push notification
- how to get FCM device token
- FCM notification not showing
- Firebase push notification not working
- FCM legacy API replacement

The site intentionally does not target unrelated phrases such as Python `pytest` or literal notary-service testing. Irrelevant keyword stuffing would weaken search intent and is contrary to Google Search Essentials.

## Page-to-query mapping

| Page | Main intent |
| --- | --- |
| `/` | FCM notification tester / Firebase push notification tester |
| `/guides/test-fcm-notification-online.html` | test FCM notification online |
| `/guides/firebase-service-account-json.html` | Firebase service account JSON key |
| `/guides/get-fcm-device-token.html` | get FCM device token / registration token |
| `/guides/fcm-http-v1-api.html` | FCM HTTP v1 API / legacy migration |
| `/guides/fcm-notification-not-showing.html` | FCM notification not showing / troubleshooting |
| `/docs.html` | FCM testing guides hub |

## Technical SEO already implemented

- one descriptive H1 per indexable page
- unique page titles and descriptions
- canonical URLs generated from `SITE_URL`
- `robots.txt` generated from `SITE_URL`
- XML sitemap generated at build time
- `lastmod` in sitemap
- legal/security pages kept `noindex,follow`
- Vercel preview deployments forced to `noindex,nofollow`
- semantic HTML and crawlable `<a href>` links
- lightweight static HTML/CSS/JS for strong performance
- no external font dependency
- no large framework bundle
- WebSite and SoftwareApplication JSON-LD on the homepage
- Article/CollectionPage JSON-LD on guide content
- descriptive Open Graph metadata and social image
- Search Console verification without editing source code

## Post-launch checklist

Code alone cannot guarantee a number-one ranking. After the custom domain is live:

1. Add the domain property in Google Search Console.
2. Submit `/sitemap.xml`.
3. Use URL Inspection to request indexing for the homepage and guide pages.
4. Confirm the production canonical URL is the custom domain.
5. Run PageSpeed Insights and fix any real Core Web Vitals regressions introduced by hosting, ads, or analytics.
6. Add the site to relevant developer profiles, GitHub README files, FCM tutorials, and legitimate developer communities when useful.
7. Earn natural links by making the tester genuinely useful; do not buy spam backlinks.
8. Monitor Search Console queries. Expand content only where users are already showing relevant search demand.
9. Keep Firebase technical details current when Google changes FCM behavior.

## AdSense and ranking

Ads are not rendered until AdSense environment variables are configured. Keep ads separated from form controls, avoid accidental-click layouts, and prioritize the testing utility above advertising. Do not let ads shift the send button during page load.

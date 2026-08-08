# AdSense Setup

The UI is AdSense-ready but ads are disabled by default.

Set these environment variables in Vercel:

```text
ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
ADSENSE_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX
ADSENSE_SLOT_TOP=1234567890
ADSENSE_SLOT_MIDDLE=1234567890
ADSENSE_SLOT_FOOTER=1234567890
```

The three ad hosts are placed outside the credential form and send button area. They remain hidden when their slot is not configured.

The production build creates `ads.txt` automatically from `ADSENSE_PUBLISHER_ID`.

Before enabling ads, confirm the Privacy page and any legally required consent mechanism are appropriate for the countries where the site is served.

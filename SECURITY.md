# Security Notes

The intended user flow requires processing a Firebase/Google Cloud service-account JSON private key.

## Implemented safeguards

- credentials are not intentionally persisted by application code
- no localStorage, cookie, or database storage for service-account JSON
- API responses do not echo the private key
- OAuth token endpoint is hardcoded to `https://oauth2.googleapis.com/token`
- FCM endpoint is constructed only from a validated `project_id`
- request body size is limited
- private-key shape is validated before signing
- same-origin CORS is the default; production can additionally pin `ALLOWED_ORIGINS`
- API responses are marked `Cache-Control: no-store`
- no service-account fixture or secret is included in the repository

## Operational warnings

A hosting platform may have infrastructure-level request metadata or logging outside this application's source code. Do not enable request-body logging, session replay, or analytics capture on credential fields.

Use a dedicated least-privilege testing service account where possible and rotate a key if exposure is suspected.

# Fuel WHOOP token broker

A tiny **stateless** service that holds the WHOOP `client_secret` and performs the
OAuth steps that must not happen in the mobile app:

- `POST /api/whoop/token` — exchange an authorization `code` for tokens.
- `POST /api/whoop/refresh` — exchange a `refresh_token` for fresh tokens.

WHOOP's OAuth requires the client secret in the token exchange and does **not** support
PKCE, so a public mobile app cannot do this securely on its own. This broker is the
minimal server-side piece that makes a public, multi-user WHOOP integration possible.
It stores nothing and never sees user data beyond passing tokens through.

## Deploy (Vercel)

1. `npm install` in this directory.
2. Set env vars (Vercel dashboard → Settings → Environment Variables, or `vercel env add`):
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
3. `npm run deploy` (or push to a Vercel-linked repo).
4. Note the deployment URL, e.g. `https://fuel-whoop-broker.vercel.app`.

## Wire up the app

In the Fuel app's `app.json`, set `expo.extra.whoop`:

```json
"whoop": {
  "brokerUrl": "https://fuel-whoop-broker.vercel.app/api",
  "clientId": "your_whoop_client_id"
}
```

> Note: the app calls `${brokerUrl}/whoop/token` and `${brokerUrl}/whoop/refresh`, so
> `brokerUrl` should include the `/api` path prefix used by Vercel functions.

## WHOOP dashboard setup

At https://developer-dashboard.whoop.com create a Team, then an App with:

- **Redirect URI**: `fuel://whoop-callback`
- **Scopes**: `read:workout`, `read:cycle`, `offline`

Dev mode allows up to 10 whitelisted members with no review. Submit for production
approval to open it to any WHOOP member.

## Notes

- Runs on any Node serverless host; the handlers are framework-light. For Cloudflare
  Workers / other hosts, adapt the `(req, res)` signature to that platform's API.
- Consider adding rate limiting and an allowlist of expected redirect URIs in production.

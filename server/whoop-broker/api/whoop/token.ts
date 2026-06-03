import type { VercelRequest, VercelResponse } from '@vercel/node';

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

/**
 * Exchange a WHOOP authorization code for tokens. The client secret lives only
 * here (as an env var) and is never exposed to the mobile app.
 *
 * POST body: { code: string, redirectUri: string }
 * Response:  { access_token, refresh_token, expires_in }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { code, redirectUri } = (req.body ?? {}) as {
    code?: string;
    redirectUri?: string;
  };
  if (!code || !redirectUri) {
    res.status(400).json({ error: 'missing_params' });
    return;
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const whoopRes = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = (await whoopRes.json()) as Record<string, unknown>;
    if (!whoopRes.ok) {
      // Never echo the upstream body — it can leak request details.
      res.status(whoopRes.status).json({ error: 'token_exchange_failed' });
      return;
    }
    res.status(200).json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch {
    res.status(502).json({ error: 'upstream_unreachable' });
  }
}

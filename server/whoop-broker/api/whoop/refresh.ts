import type { VercelRequest, VercelResponse } from '@vercel/node';

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

/**
 * Refresh a WHOOP access token. Requires the `offline` scope to have been
 * granted during the initial authorization.
 *
 * POST body: { refresh_token: string }
 * Response:  { access_token, refresh_token, expires_in }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { refresh_token: refreshToken } = (req.body ?? {}) as {
    refresh_token?: string;
  };
  if (!refreshToken) {
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
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'offline',
  });

  try {
    const whoopRes = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = (await whoopRes.json()) as Record<string, unknown>;
    if (!whoopRes.ok) {
      res.status(whoopRes.status).json({ error: 'refresh_failed' });
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

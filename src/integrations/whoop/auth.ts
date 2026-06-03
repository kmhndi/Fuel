import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { WHOOP_AUTH_URL, WHOOP_CONFIG, WHOOP_SCOPES } from './config';
import {
  type BrokerTokenResponse,
  saveTokens,
  tokensFromBrokerResponse,
} from './tokens';

// Ensure the auth-session popup is dismissed cleanly when control returns.
WebBrowser.maybeCompleteAuthSession();

/** Custom-scheme redirect, registered identically in the WHOOP dashboard. */
const REDIRECT_URI = 'fuel://whoop-callback';

export type ConnectResult = 'connected' | 'cancelled' | 'error';

function randomState(): string {
  return `${Date.now().toString(36)}.${Math.random()
    .toString(36)
    .slice(2)}${Math.random().toString(36).slice(2)}`;
}

/**
 * Run the WHOOP OAuth authorization-code flow: open WHOOP's consent screen,
 * capture the `code` from the custom-scheme redirect, exchange it for tokens
 * via the broker (which holds the client secret), and persist them.
 */
export async function connectWhoop(): Promise<ConnectResult> {
  const state = randomState();
  const authUrl =
    `${WHOOP_AUTH_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(WHOOP_CONFIG.clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(WHOOP_SCOPES.join(' '))}` +
    `&state=${encodeURIComponent(state)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
  if (result.type !== 'success' || !result.url) {
    return result.type === 'cancel' || result.type === 'dismiss'
      ? 'cancelled'
      : 'error';
  }

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  const returnedState = queryParams?.state;
  if (returnedState !== state) return 'error'; // CSRF guard
  if (typeof code !== 'string') return 'error';

  const tokens = await exchangeCode(code);
  if (!tokens) return 'error';
  await saveTokens(tokens);
  return 'connected';
}

async function exchangeCode(code: string) {
  try {
    const res = await fetch(`${WHOOP_CONFIG.brokerUrl}/whoop/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BrokerTokenResponse;
    return tokensFromBrokerResponse(data);
  } catch {
    return null;
  }
}

import * as SecureStore from 'expo-secure-store';
import { WHOOP_CONFIG } from './config';

const KEY = 'whoop_tokens';

/** OAuth tokens for the linked WHOOP account, persisted in the device keychain. */
export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which the access token expires. */
  expiresAt: number;
}

/** Shape returned by the broker's /whoop/token and /whoop/refresh endpoints. */
export interface BrokerTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export function tokensFromBrokerResponse(
  data: BrokerTokenResponse,
  fallbackRefresh?: string,
): WhoopTokens {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? fallbackRefresh ?? '',
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
}

export async function saveTokens(tokens: WhoopTokens): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<WhoopTokens | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WhoopTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

/**
 * Return a usable access token, transparently refreshing via the broker when
 * the current one is expired (or about to be). Returns null if no account is
 * linked or the refresh fails (caller should treat that as disconnected).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;
  // 60s skew so a token doesn't expire mid-request.
  if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;

  const refreshed = await refreshTokens(tokens.refreshToken);
  if (!refreshed) {
    await clearTokens();
    return null;
  }
  await saveTokens(refreshed);
  return refreshed.accessToken;
}

async function refreshTokens(refreshToken: string): Promise<WhoopTokens | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${WHOOP_CONFIG.brokerUrl}/whoop/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BrokerTokenResponse;
    return tokensFromBrokerResponse(data, refreshToken);
  } catch {
    return null;
  }
}

import Constants from 'expo-constants';

/** Public WHOOP config, read from app.json `expo.extra.whoop`. No secrets here. */
interface WhoopConfig {
  /** Base URL of the token broker that holds the WHOOP client secret. */
  brokerUrl: string;
  /** WHOOP OAuth client id (public). */
  clientId: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  whoop?: Partial<WhoopConfig>;
};

export const WHOOP_CONFIG: WhoopConfig = {
  brokerUrl: (extra.whoop?.brokerUrl ?? '').replace(/\/$/, ''),
  clientId: extra.whoop?.clientId ?? '',
};

/** WHOOP OAuth authorize endpoint (token exchange happens via the broker). */
export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';

/** Base path for WHOOP's developer REST API. */
export const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer';

/** Scopes Fuel needs: per-workout + daily cycle energy, plus refresh tokens. */
export const WHOOP_SCOPES = ['read:workout', 'read:cycle', 'offline'];

/** True once real broker URL + client id have been filled into app.json. */
export function isWhoopConfigured(): boolean {
  const { brokerUrl, clientId } = WHOOP_CONFIG;
  return (
    brokerUrl.length > 0 &&
    !brokerUrl.includes('CHANGE_ME') &&
    clientId.length > 0 &&
    !clientId.includes('CHANGE_ME')
  );
}

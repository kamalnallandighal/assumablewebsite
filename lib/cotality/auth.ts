import { loadCotalityEnv } from './env';

interface TokenCache {
  accessToken: string;
  expiresAt: number;       // epoch ms
}

let cache: TokenCache | null = null;
const SAFETY_WINDOW_MS = 30_000;

export async function getCotalityToken(now: () => number = Date.now): Promise<string> {
  if (cache && cache.expiresAt - SAFETY_WINDOW_MS > now()) {
    return cache.accessToken;
  }
  const { COTALITY_CLIENT_ID, COTALITY_CLIENT_SECRET } = loadCotalityEnv();
  const basic = Buffer.from(`${COTALITY_CLIENT_ID}:${COTALITY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api1.cotality.com/oauth/token?grant_type=client_credentials', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` }
  });
  if (!res.ok) {
    throw new Error(`Cotality OAuth failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    accessToken: body.access_token,
    expiresAt: now() + body.expires_in * 1000
  };
  return cache.accessToken;
}

export function _resetCotalityTokenCacheForTests() {
  cache = null;
}

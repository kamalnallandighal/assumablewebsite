import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCotalityToken, _resetCotalityTokenCacheForTests } from '../../lib/cotality/auth';

describe('getCotalityToken', () => {
  beforeEach(() => {
    _resetCotalityTokenCacheForTests();
    process.env.COTALITY_CLIENT_ID = 'id';
    process.env.COTALITY_CLIENT_SECRET = 'secret';
    vi.restoreAllMocks();
  });

  it('fetches a token then reuses cache', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: 'tok-1', expires_in: 600 }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const now = () => 1000;

    const t1 = await getCotalityToken(now);
    const t2 = await getCotalityToken(now);
    expect(t1).toBe('tok-1');
    expect(t2).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes after expiry', async () => {
    const responses = [
      new Response(JSON.stringify({ access_token: 'tok-A', expires_in: 1 }), { status: 200 }),
      new Response(JSON.stringify({ access_token: 'tok-B', expires_in: 600 }), { status: 200 })
    ];
    const fetchMock = vi.fn(async () => responses.shift()!);
    vi.stubGlobal('fetch', fetchMock);
    let t = 1000;
    const now = () => t;

    expect(await getCotalityToken(now)).toBe('tok-A');
    t += 5_000;
    expect(await getCotalityToken(now)).toBe('tok-B');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    await expect(getCotalityToken()).rejects.toThrow(/401/);
  });
});

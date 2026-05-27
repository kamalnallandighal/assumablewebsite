import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchProperty, getCurrentMortgage } from '../../lib/cotality/client';
import { _resetCotalityTokenCacheForTests } from '../../lib/cotality/auth';

beforeEach(() => {
  _resetCotalityTokenCacheForTests();
  process.env.COTALITY_CLIENT_ID = 'id';
  process.env.COTALITY_CLIENT_SECRET = 'secret';
  vi.restoreAllMocks();
});

describe('searchProperty', () => {
  it('returns first hit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ clip: 'CLIP-1', state: 'AZ' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const hit = await searchProperty({ streetAddress: '123 Main', state: 'AZ', zipCode: '85001' });
    expect(hit?.clip).toBe('CLIP-1');
    expect(fetchMock.mock.calls[1][0]).toContain('/v2/properties/search');
  });

  it('returns null when no items', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
    );
    const hit = await searchProperty({ streetAddress: '999 Nowhere', state: 'AZ', zipCode: '00000' });
    expect(hit).toBeNull();
  });
});

describe('getCurrentMortgage', () => {
  it('returns the product payload', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        clip: 'CLIP-1',
        items: [{ mortgageTransactionDetail: { loanTypeCode: 'FHA', interestRate: 0 } }]
      }), { status: 200 }))
    );
    const result = await getCurrentMortgage('CLIP-1');
    expect(result.items?.[0].mortgageTransactionDetail?.loanTypeCode).toBe('FHA');
  });

  it('propagates errors with status code', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
    );
    await expect(getCurrentMortgage('CLIP-1')).rejects.toThrow(/429/);
  });
});

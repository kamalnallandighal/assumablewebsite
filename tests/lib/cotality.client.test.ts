import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchProperty,
  getCurrentMortgage,
  getEnrichedLiens
} from '../../lib/cotality/client';
import { _resetCotalityTokenCacheForTests } from '../../lib/cotality/auth';

beforeEach(() => {
  _resetCotalityTokenCacheForTests();
  process.env.COTALITY_CLIENT_ID = 'id';
  process.env.COTALITY_CLIENT_SECRET = 'secret';
  vi.restoreAllMocks();
});

// Helper: an Authorization header pulled out of a fetch call's init.
function authHeader(call: unknown[]): string | undefined {
  const init = call[1] as RequestInit | undefined;
  if (!init?.headers) return undefined;
  const headers = init.headers as Record<string, string>;
  return headers.Authorization ?? headers.authorization;
}

describe('searchProperty', () => {
  it('returns first hit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ clip: 'CLIP-1', state: 'AZ' }] }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);

    const hit = await searchProperty({ streetAddress: '123 Main', state: 'AZ', zipCode: '85001' });
    expect(hit?.clip).toBe('CLIP-1');
    expect(fetchMock.mock.calls[1][0]).toContain('/v2/properties/search');
  });

  it('sends Bearer (not OAuth) auth header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'TOKEN-A', expires_in: 600 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ properties: [{ clip: 'CLIP-X' }] }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);

    await searchProperty({ streetAddress: '1 Test', state: 'AZ', zipCode: '85001' });
    expect(authHeader(fetchMock.mock.calls[1])).toBe('Bearer TOKEN-A');
  });

  it('falls back to `properties` when payload uses that key', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ properties: [{ clip: 'P-1' }] }), { status: 200 })
        )
    );
    const hit = await searchProperty({ streetAddress: '2 Test', state: 'AZ', zipCode: '85001' });
    expect(hit?.clip).toBe('P-1');
  });

  it('returns null on 404 (no match)', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ properties: [], messages: [] }), { status: 404 })
        )
    );
    const hit = await searchProperty({ streetAddress: '999 Nowhere', state: 'AZ', zipCode: '00000' });
    expect(hit).toBeNull();
  });

  it('returns null when items array is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ items: [] }), { status: 200 })
        )
    );
    const hit = await searchProperty({ streetAddress: '999 Nowhere', state: 'AZ', zipCode: '00000' });
    expect(hit).toBeNull();
  });
});

describe('getCurrentMortgage', () => {
  it('returns the product payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              clip: 'CLIP-1',
              items: [{ mortgageTransactionDetail: { loanTypeCode: 'FHA', interestRate: 0 } }]
            }),
            { status: 200 }
          )
        )
    );
    const result = await getCurrentMortgage('CLIP-1');
    expect(result.items?.[0].mortgageTransactionDetail?.loanTypeCode).toBe('FHA');
  });

  it('propagates errors with status code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
    );
    await expect(getCurrentMortgage('CLIP-1')).rejects.toThrow(/429/);
  });
});

describe('getEnrichedLiens', () => {
  it('hits the enriched endpoint with Bearer + clip', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'TOKEN-B', expires_in: 600 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              clip: '3129147428',
              openLiens: [
                {
                  mortgageTransactionDetails: {
                    enrichedInterestRate: 2.8,
                    enrichedInterestRateConfidenceRank: 5,
                    enrichedLoanTypeCode: 'VA',
                    enrichedLoanTypeCodeConfidenceRank: 5
                  }
                }
              ]
            }
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEnrichedLiens('3129147428');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api1.cotality.com/v2/properties/liens/enriched/3129147428'
    );
    expect(authHeader(fetchMock.mock.calls[1])).toBe('Bearer TOKEN-B');
    expect(result.data?.openLiens?.[0]?.mortgageTransactionDetails?.enrichedInterestRate).toBe(2.8);
  });

  it('propagates 5xx as a thrown error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(new Response('boom', { status: 500 }))
    );
    await expect(getEnrichedLiens('CLIP-X')).rejects.toThrow(/500/);
  });
});

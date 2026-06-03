import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deriveBadge, probeAddress } from '../../lib/cotality/probe';
import { _resetCotalityTokenCacheForTests } from '../../lib/cotality/auth';

beforeEach(() => {
  _resetCotalityTokenCacheForTests();
  process.env.COTALITY_CLIENT_ID = 'id';
  process.env.COTALITY_CLIENT_SECRET = 'secret';
  vi.restoreAllMocks();
});

describe('deriveBadge', () => {
  it('returns verified when all confidences >= 4', () => {
    expect(deriveBadge(5, 5, 4)).toBe('verified');
    expect(deriveBadge(4, 4, 4)).toBe('verified');
  });

  it('returns plain when worst confidence is exactly 3', () => {
    expect(deriveBadge(5, 3, 5)).toBe('plain');
    expect(deriveBadge(3, 3, 3)).toBe('plain');
  });

  it('returns contact-agent when worst is <=2', () => {
    expect(deriveBadge(5, 2, 4)).toBe('contact-agent');
    expect(deriveBadge(1, 5, 5)).toBe('contact-agent');
  });

  it('ignores null confidences but uses any defined value', () => {
    expect(deriveBadge(null, 5, null)).toBe('verified');
    expect(deriveBadge(null, 3, null)).toBe('plain');
    expect(deriveBadge(null, 1, null)).toBe('contact-agent');
  });

  it('returns null when every confidence is null', () => {
    expect(deriveBadge(null, null, null)).toBeNull();
  });
});

describe('probeAddress', () => {
  it('returns empty result on 404 search miss (no enriched call)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ properties: [], messages: [] }), { status: 404 })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeAddress({
      streetAddress: '2208 N 78th Gln',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85035'
    });

    expect(result.clip).toBeNull();
    expect(result.badge).toBeNull();
    expect(result.interestRate).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('normalizes a verified VA enriched response end-to-end', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
      )
      // search hit
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            properties: [{ clip: '3129147428' }]
          }),
          { status: 200 }
        )
      )
      // enriched body modeled on the validated 2208 N 78th Gln response
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
                    enrichedInterestRateTypeCode: 'FIX',
                    enrichedInterestRateTypeCodeConfidenceRank: 4,
                    enrichedLoanTypeCode: 'VA',
                    enrichedLoanTypeCodeConfidenceRank: 5,
                    enrichedTerm: 30,
                    enrichedTermCode: 'Y',
                    enrichedMortgageLienPosition: 1,
                    amount: 259060,
                    maturityDate: 20520201
                  },
                  currentLenderDetails: { companyName: 'PENNYMAC LN SVCS LLC' }
                }
              ],
              enriched: {
                unpaidPrincipalBalance: 233126,
                upbConfidenceRank: 5,
                presentLTV: 67,
                presentLTVConfidenceRank: 5,
                upbAndPLTVRunDate: 20260501
              },
              openLienEquityAndLTV: {
                totalNumberOfOpenMortgageLiens: 1,
                estimatedEquity: 84158,
                purchaseAmount: 265000,
                purchaseRecordingDate: 20210413
              }
            }
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeAddress({
      streetAddress: '2208 N 78th Gln',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85035'
    });

    expect(result.clip).toBe('3129147428');
    expect(result.loanType).toBe('VA');
    expect(result.interestRate).toBe(2.8);
    expect(result.interestRateType).toBe('FIX');
    expect(result.unpaidBalance).toBe(233126);
    expect(result.presentLTV).toBe(67);
    expect(result.estimatedEquity).toBe(84158);
    expect(result.term).toBe(30);
    expect(result.maturityDate).toBe(20520201);
    expect(result.servicer).toBe('PENNYMAC LN SVCS LLC');
    expect(result.openLienCount).toBe(1);
    // min(5, 5, 4) = 4 → verified
    expect(result.badge).toBe('verified');
  });

  it('downgrades to contact-agent when a confidence is <=2', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ properties: [{ clip: 'C' }] }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                clip: 'C',
                openLiens: [
                  {
                    mortgageTransactionDetails: {
                      enrichedInterestRate: 3.5,
                      enrichedInterestRateConfidenceRank: 2,
                      enrichedLoanTypeCode: 'FHA',
                      enrichedLoanTypeCodeConfidenceRank: 5
                    }
                  }
                ]
              }
            }),
            { status: 200 }
          )
        )
    );

    const result = await probeAddress({
      streetAddress: '1 X',
      state: 'AZ',
      zipCode: '85001'
    });
    expect(result.badge).toBe('contact-agent');
  });

  it('captures fetch errors in result.error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 })
        )
        .mockResolvedValueOnce(new Response('boom', { status: 500 }))
    );

    const result = await probeAddress({
      streetAddress: '1 X',
      state: 'AZ',
      zipCode: '85001'
    });
    expect(result.clip).toBeNull();
    expect(result.error).toMatch(/500/);
  });
});

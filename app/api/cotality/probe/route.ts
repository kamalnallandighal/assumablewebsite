import { NextResponse } from 'next/server';
import { z } from 'zod';
import { probeAddress, type ProbeAddress } from '../../../../lib/cotality/probe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cotality trial caps at 100 calls/day; each address costs ~2 calls.
// Hard-cap at 10 addresses per request to keep a single curl from burning the budget.
const bodySchema = z.object({
  addresses: z.array(z.object({
    streetAddress: z.string().min(1),
    city: z.string().optional(),
    state: z.string().length(2),
    zipCode: z.string().min(5),
    label: z.string().optional()
  })).min(1).max(10)
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const results = [];
  for (const addr of parsed.data.addresses as ProbeAddress[]) {
    results.push(await probeAddress(addr));
  }

  const summary = {
    total: results.length,
    withClip: results.filter(r => r.clip).length,
    withMortgage: results.filter(r => r.primary).length,
    withRate: results.filter(r => typeof r.primary?.interestRate === 'number' && r.primary.interestRate > 0).length,
    byLoanType: results.reduce<Record<string, number>>((acc, r) => {
      const code = r.primary?.loanTypeCode ?? 'unknown';
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    }, {})
  };

  return NextResponse.json({ summary, results });
}

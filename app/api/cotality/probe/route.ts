import { NextResponse } from 'next/server';
import { z } from 'zod';
import { probeAddress, type ProbeAddress } from '../../../../lib/cotality/probe';
import { probeDefaults } from '../../../../lib/cotality/probe-defaults';

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

async function runProbe(addresses: ProbeAddress[]) {
  const results = [];
  for (const addr of addresses) {
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
  return { summary, results };
}

// GET runs the canned one-per-city defaults from lib/cotality/probe-defaults.ts.
// Use this for the first validation pass; ~16 calls of your 100/day budget.
export async function GET() {
  try {
    return NextResponse.json(await runProbe(probeDefaults));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// POST accepts an explicit address list (1–10) — use this once you have
// known FHA/VA addresses you want to validate against.
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  try {
    return NextResponse.json(await runProbe(parsed.data.addresses as ProbeAddress[]));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

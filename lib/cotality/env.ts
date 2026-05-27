import { z } from 'zod';

const schema = z.object({
  COTALITY_CLIENT_ID: z.string().min(1, 'COTALITY_CLIENT_ID is required'),
  COTALITY_CLIENT_SECRET: z.string().min(1, 'COTALITY_CLIENT_SECRET is required')
});

export function loadCotalityEnv() {
  const parsed = schema.safeParse({
    COTALITY_CLIENT_ID: process.env.COTALITY_CLIENT_ID,
    COTALITY_CLIENT_SECRET: process.env.COTALITY_CLIENT_SECRET
  });
  if (!parsed.success) {
    throw new Error(`Cotality env missing: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
  }
  return parsed.data;
}

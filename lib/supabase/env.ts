import { z } from 'zod';

// Treat empty strings as unset. Avoids tripping on a half-filled .env.local
// during setup. Also makes the URL validator tolerate truly-missing values.
const optional = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  // Supabase renamed "anon" → "publishable" and "service_role" → "secret" in
  // late 2025. Accept both names so docs / examples using either work.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional()
});

export function loadSupabaseEnv() {
  // Public-side (client-safe) key — prefer the new name, fall back to legacy.
  const publicKey =
    optional(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return schema.parse({
    NEXT_PUBLIC_SUPABASE_URL: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey
  });
}

/** Server-only secret key. Returns undefined when unset. */
export function getSupabaseSecretKey(): string | undefined {
  return (
    optional(process.env.SUPABASE_SECRET_KEY) ??
    optional(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

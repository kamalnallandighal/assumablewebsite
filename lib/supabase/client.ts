import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey, loadSupabaseEnv } from './env';

// Tracks the latest config so the singleton stays correct across env edits in dev.
let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

/**
 * Anon-key client safe for any context (SSR, RSC, route handlers, browser).
 * Respects RLS — only reads what the anon role is allowed to see.
 *
 * Returns null when env vars are unset. Callers fall back to the JSON fixture.
 */
export function getSupabaseAnonClient(): SupabaseClient | null {
  const env = loadSupabaseEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const key = `${env.NEXT_PUBLIC_SUPABASE_URL}|${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  if (cachedClient && cachedKey === key) return cachedClient;

  cachedClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  cachedKey = key;
  return cachedClient;
}

let cachedServiceClient: SupabaseClient | null = null;
let cachedServiceKey: string | null = null;

/**
 * Service-role client that bypasses RLS. SERVER-SIDE ONLY.
 * Use from background workers, seed scripts, admin API routes.
 *
 * Throws if the service-role key isn't set — that's a configuration error you
 * want loud, not a silent fallback.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  const env = loadSupabaseEnv();
  const secretKey = getSupabaseSecretKey();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !secretKey) {
    throw new Error(
      'Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and a secret key ' +
        '(SUPABASE_SECRET_KEY, or legacy SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  const key = `${env.NEXT_PUBLIC_SUPABASE_URL}|${secretKey}`;
  if (cachedServiceClient && cachedServiceKey === key) return cachedServiceClient;

  cachedServiceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { persistSession: false }
  });
  cachedServiceKey = key;
  return cachedServiceClient;
}

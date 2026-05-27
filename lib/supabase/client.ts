import { loadSupabaseEnv } from './env';

export function getSupabaseClient() {
  const env = loadSupabaseEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured yet — wire env after pipeline validation.');
  }
  throw new Error('Supabase client not implemented yet. See plan task post-validation.');
}

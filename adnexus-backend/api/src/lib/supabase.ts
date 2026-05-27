import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/** Service-role Supabase client for backend operations */
export const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Get a database query builder for a table */
export function db(table: string) {
  return supabase.from(table);
}

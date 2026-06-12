import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const serviceClientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
};

/** Service-role client for PostgREST / database operations. Never call auth.admin on this instance — createUser mutates the session JWT and breaks RLS bypass on inserts. */
export const supabase = createClient(config.supabase.url, config.supabase.serviceKey, serviceClientOptions);

/** Isolated service-role client for Supabase Auth admin APIs only (createUser, deleteUser, listUsers). */
export const supabaseAuthAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  serviceClientOptions,
);

/** Get a database query builder for a table */
export function db(table: string) {
  return supabase.from(table);
}

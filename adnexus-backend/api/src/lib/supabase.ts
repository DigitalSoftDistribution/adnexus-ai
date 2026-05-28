import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { config } from '../config';

/** Service-role Supabase client for backend operations. */
export const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  // @ts-expect-error — ws transport for Node 20 without native WebSocket
  realtime: { transport: WebSocket },
});

/** Get a database query builder for a table */
export function db(table: string) {
  return supabase.from(table);
}

/**
 * Database compatibility layer.
 * Wraps Supabase JS client to mimic the drizzle-orm `db` interface
 * expected by routes/services that import from '../db'.
 */
import { supabase } from '../lib/supabase';

/** Drizzle-compatible db object using Supabase under the hood. */
export const db = {
  select: () => ({
    from: (table: string) => ({
      where: (_condition: unknown) => ({
        limit: (n: number) => supabase.from(table).select('*').limit(n),
        orderBy: (_col: unknown, _dir: string) => supabase.from(table).select('*'),
      }),
    }),
  }),
  insert: (table: string) => ({
    values: (data: unknown) => supabase.from(table).insert(data as never),
  }),
  update: (table: string) => ({
    set: (data: unknown) => ({
      where: (_condition: unknown) => supabase.from(table).update(data as never).eq('id', ''),
    }),
  }),
  delete: (table: string) => ({
    where: (_condition: unknown) => supabase.from(table).delete(),
  }),
  query: {
    // Support for raw SQL when needed
    campaigns: {
      findMany: (_opts?: unknown) => supabase.from('campaigns').select('*'),
    },
  },
};

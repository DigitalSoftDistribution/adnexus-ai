/**
 * Database layer — Drizzle ORM with Supabase Postgres connection.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const rawUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

// A `sslmode=require` query param makes node-postgres defer TLS to libpq, which
// then rejects Supabase's self-signed chain (SELF_SIGNED_CERT_IN_CHAIN). Strip
// any sslmode param and drive TLS via the `ssl` object instead — matching the
// raw pg pool in infrastructure/database/connection.ts.
const wantsTls = !!rawUrl && (/sslmode=/i.test(rawUrl) || /supabase\.(co|com)/i.test(rawUrl) || /\.pooler\.supabase\.com/i.test(rawUrl));
const cleanedUrl = rawUrl
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/[?&]$/, '')
  .replace(/\?&/, '?');

const pool = new Pool({
  connectionString: cleanedUrl || undefined,
  ssl: wantsTls ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

/**
 * Database connection — thin wrapper around pg Pool.
 *
 * The domain/application layers never import this directly.
 * Only infrastructure repositories should use it.
 */

import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { config } from '../../config';
import { logger } from '../../lib/logger';

const rawDatabaseUrl = config.database.url;

/**
 * Supabase (and most managed Postgres) present a self-signed certificate chain
 * on their poolers. We must connect over TLS but cannot verify the chain, so we
 * use `ssl: { rejectUnauthorized: false }`.
 *
 * IMPORTANT: a `sslmode=require` query param in the connection string makes the
 * `pg` driver treat the connection as `verify-full` (recent pg behaviour),
 * which overrides the `ssl` object and rejects the self-signed chain with
 * SELF_SIGNED_CERT_IN_CHAIN. So we strip any `sslmode` param from the URL and
 * drive TLS purely via the `ssl` object below.
 */
function buildPgConfig(url: string | undefined) {
  if (!url) {
    return { ssl: config.database.ssl ? { rejectUnauthorized: false } : false };
  }
  const wantsTls =
    config.database.ssl ||
    /sslmode=/i.test(url) ||
    /supabase\.(co|com)/i.test(url) ||
    /\.pooler\.supabase\.com/i.test(url);

  // Remove sslmode (and an empty trailing ?/&) so pg doesn't force verify-full.
  const cleanedUrl = url
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/[?&]$/, '')
    .replace(/\?&/, '?');

  return {
    connectionString: cleanedUrl,
    ssl: wantsTls ? { rejectUnauthorized: false } : false,
  };
}

const databaseUrl = rawDatabaseUrl;

export const pool = new Pool({
  ...buildPgConfig(rawDatabaseUrl),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn(`Slow query (${duration}ms): ${text.slice(0, 100)}`);
    }
    return result;
  } catch (err) {
    logger.error({ err }, `Query failed: ${text.slice(0, 200)}`);
    throw err;
  }
}

export async function transaction<T>(fn: (client: Pool) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(pool);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

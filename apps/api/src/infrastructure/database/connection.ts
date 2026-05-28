/**
 * Database connection — thin wrapper around pg Pool.
 *
 * The domain/application layers never import this directly.
 * Only infrastructure repositories should use it.
 */

import { Pool, type QueryResult } from 'pg';
import { config } from '../../config';
import { logger } from '../../lib/logger';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
});

export async function query<T = unknown>(
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
    logger.error(`Query failed: ${text.slice(0, 200)}`, err);
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

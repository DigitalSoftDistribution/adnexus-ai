/**
 * Database Connection Pool
 *
 * PostgreSQL connection management with:
 * - Connection pooling via pg.Pool
 * - Parameterized query helper
 * - Multi-statement transaction helper
 * - Graceful error handling & reconnection
 * - Slow query warnings (>1s)
 */

import { Pool, PoolClient, QueryResult, types } from "pg";
import { config } from "../config";
import { logger } from "../utils/logger";

// Parse NUMERIC types as float instead of string
// Use with caution — only safe when precision is not critical
const NUMERIC_OID = 1700;
types.setTypeParser(NUMERIC_OID, (val: string) => parseFloat(val));

// Parse INT8 (BIGINT) as integer instead of string
const INT8_OID = 20;
types.setTypeParser(INT8_OID, (val: string) => parseInt(val, 10));

/**
 * Global connection pool instance.
 * Uses config-driven connection string; falls back to individual params.
 */
export const pool = new Pool({
  connectionString: config.database.url,
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,

  // Pool tuning for production
  max: config.database.poolSize ?? 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // SSL configuration for production
  ssl: config.database.ssl
    ? {
        rejectUnauthorized: true,
        ca: config.database.sslCa,
      }
    : undefined,
});

// ── Pool event listeners ────────────────────────────────────────────────────

pool.on("connect", () => {
  logger.debug("[DB] New client connected to pool");
});

pool.on("error", (err: Error) => {
  logger.error("[DB] Unexpected pool error", { error: err.message });
  // Pool will auto-reconnect; we just log here
});

pool.on("acquire", () => {
  const { totalCount, idleCount, waitingCount } = pool;
  if (waitingCount > 5) {
    logger.warn(`[DB] Pool pressure — waiting: ${waitingCount}, idle: ${idleCount}, total: ${totalCount}`);
  }
});

// ── Graceful shutdown ───────────────────────────────────────────────────────

export async function closePool(): Promise<void> {
  logger.info("[DB] Closing connection pool...");
  await pool.end();
  logger.info("[DB] Connection pool closed");
}

// ── Query helpers ───────────────────────────────────────────────────────────

export interface QueryOptions {
  /** Query name for logging/tracking */
  name?: string;
}

/**
 * Execute a parameterized SQL query.
 *
 * @example
 *   const { rows } = await query("SELECT * FROM users WHERE id = $1", [userId]);
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
  options?: QueryOptions
): Promise<QueryResult<T>> {
  const start = Date.now();
  const queryName = options?.name ?? "unnamed";

  try {
    const result = await pool.query<T>(sql, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn(`[DB] Slow query (${duration}ms): ${queryName}`, {
        query: sql.slice(0, 200),
        duration,
        rows: result.rowCount,
      });
    } else {
      logger.debug(`[DB] Query OK (${duration}ms): ${queryName}`, {
        rows: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`[DB] Query failed (${duration}ms): ${queryName}`, {
      query: sql.slice(0, 200),
      params: params?.map((p, i) => `$${i + 1}=${JSON.stringify(p)}`),
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Execute a multi-statement transaction.
 *
 * Provides a client that must be used for all queries within the
 * transaction. Automatically handles COMMIT/ROLLBACK.
 *
 * @example
 *   await transaction(async (client) => {
 *     await client.query("INSERT ...", [a]);
 *     await client.query("UPDATE ...", [b]);
 *   });
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  const start = Date.now();

  try {
    await client.query("BEGIN");
    logger.debug("[DB] Transaction BEGIN");

    const result = await fn(client);

    await client.query("COMMIT");
    const duration = Date.now() - start;
    logger.debug(`[DB] Transaction COMMIT (${duration}ms)`);

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("[DB] Transaction ROLLBACK", {
      error: (error as Error).message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a single client from the pool.
 * Caller is responsible for releasing it.
 *
 * @example
 *   const client = await getClient();
 *   try {
 *     // ... use client
 *   } finally {
 *     client.release();
 *   }
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Check database connectivity.
 * Returns true if a simple SELECT 1 succeeds.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Run multiple queries in parallel within a single transaction.
 * Useful for bulk inserts/updates that must succeed or fail together.
 *
 * @example
 *   await batchTransaction([
 *     { sql: "INSERT INTO logs ...", params: [a] },
 *     { sql: "UPDATE counters ...", params: [b] },
 *   ]);
 */
export async function batchTransaction(
  queries: Array<{ sql: string; params?: unknown[] }>
): Promise<QueryResult[]> {
  return transaction(async (client) => {
    const results: QueryResult[] = [];
    for (const { sql, params } of queries) {
      const result = await client.query(sql, params);
      results.push(result);
    }
    return results;
  });
}

import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;

/**
 * Get a singleton Redis client for general-purpose use.
 * For BullMQ workers, use createRedisConnection() instead
 * (BullMQ requires maxRetriesPerRequest: null).
 */
export function getRedisClient(): Redis | null {
  if (!config.redis?.url) {
    console.warn('[Redis] REDIS_URL not configured — Redis is unavailable');
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('[Redis] Max retries reached — giving up');
          return null; // stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'NR_CLOSED'];
        return targetErrors.some((t) => err.message.includes(t));
      },
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Ready');
    });

    redisClient.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    redisClient.on('reconnecting', (ms?: number) => {
      console.log(`[Redis] Reconnecting in ${ms ?? 0}ms...`);
    });
  }

  return redisClient;
}

/**
 * Create a dedicated Redis connection for BullMQ workers.
 * BullMQ requires `maxRetriesPerRequest: null` for its Lua scripting.
 */
export function createRedisConnection(url?: string): Redis {
  const redisUrl = url || config.redis?.url;

  if (!redisUrl) {
    throw new Error(
      'REDIS_URL is required for BullMQ workers. ' +
      'Set REDIS_URL in your environment or config.'
    );
  }

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'NR_CLOSED'];
      return targetErrors.some((t) => err.message.includes(t));
    },
    retryStrategy: (times) => {
      if (times > 10) {
        console.error('[Redis:Worker] Max retries reached — giving up');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
  });

  connection.on('error', (err) => {
    console.error('[Redis:Worker] Connection error:', err.message);
  });

  connection.on('connect', () => {
    console.log('[Redis:Worker] Connected for BullMQ');
  });

  return connection;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export function isRedisAvailable(): boolean {
  const client = getRedisClient();
  return client?.status === 'ready';
}

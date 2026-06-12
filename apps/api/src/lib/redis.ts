import Redis from 'ioredis';
import { config } from '../config';
import { getModuleLogger } from './logger';

const logger = getModuleLogger('redis');

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!config.redis?.url) return null;
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
    redisClient.on('connect', () => logger.info('Redis connected'));
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export function isRedisAvailable(): boolean {
  return redisClient?.status === 'ready';
}

/**
 * Run callback once the shared Redis client is ready.
 * If Redis is not configured, or already ready, invokes synchronously or immediately.
 */
export function whenRedisReady(callback: () => void): void {
  if (!config.redis?.url) {
    return;
  }

  const client = getRedisClient();
  if (!client) {
    return;
  }

  if (client.status === 'ready') {
    callback();
    return;
  }

  client.once('ready', callback);
}

import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!config.redis?.url) return null;
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    redisClient.on('error', (err) => console.error('Redis error:', err.message));
    redisClient.on('connect', () => console.log('Redis connected'));
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
  const client = getRedisClient();
  return client?.status === 'ready';
}

import type { ICacheService } from '../../application/ports/ICacheService';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';

export class RedisCacheService implements ICacheService {
  private getKey(key: string): string {
    return `adnexus:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(this.getKey(key));
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error({ error }, `Cache get failed for key: ${key}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(this.getKey(key), ttlSeconds, serialized);
      } else {
        await redis.set(this.getKey(key), serialized);
      }
    } catch (error) {
      logger.error({ error }, `Cache set failed for key: ${key}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      logger.error({ error }, `Cache delete failed for key: ${key}`);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error({ error }, `Cache exists failed for key: ${key}`);
      return false;
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(this.getKey(pattern));
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    } catch (error) {
      logger.error({ error }, `Cache deleteByPattern failed for pattern: ${pattern}`);
      return 0;
    }
  }
}

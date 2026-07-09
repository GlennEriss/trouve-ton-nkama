import redis from '@/redis/client';
import { createLogger } from '@/lib/logger';
import type { CacheStore } from './cache-store.interface';

const logger = createLogger('cache.redis-store');

export class RedisCacheStore implements CacheStore {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      logger.warn('Redis GET failed', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      logger.warn('Redis SET failed', { key, error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.warn('Redis DEL failed', { key, error });
    }
  }
}

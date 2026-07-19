import { createLogger } from '@/lib/logger';
import type { CacheStore } from './cache-store.interface';

const logger = createLogger('cache.redis-store');
const REDIS_RETRY_DELAY_MS = 60_000;

async function getRedisClient() {
  const { default: redis } = await import('@/redis/client');
  return redis;
}

export class RedisCacheStore implements CacheStore {
  private unavailableUntil = 0;

  constructor(private readonly fallback: CacheStore | null = null) {}

  private isCircuitOpen(): boolean {
    return Date.now() < this.unavailableUntil;
  }

  private markUnavailable(operation: string, key: string, error: unknown): void {
    this.unavailableUntil = Date.now() + REDIS_RETRY_DELAY_MS;
    logger.warn(`Redis ${operation} failed; cache fallback enabled`, {
      key,
      error,
      incidentCategory: 'api',
      incidentCode: 'REDIS_UNAVAILABLE',
      retryable: true,
      retryAfterSeconds: REDIS_RETRY_DELAY_MS / 1000,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isCircuitOpen()) return this.fallback?.get<T>(key) ?? null;
    try {
      const redis = await getRedisClient();
      const value = await redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      this.markUnavailable('GET', key, error);
      return this.fallback?.get<T>(key) ?? null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.isCircuitOpen()) {
      await this.fallback?.set(key, value, ttlSeconds);
      return;
    }
    try {
      const redis = await getRedisClient();
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      this.markUnavailable('SET', key, error);
      await this.fallback?.set(key, value, ttlSeconds);
    }
  }

  async setIfAbsent<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    if (this.isCircuitOpen()) {
      return this.fallback?.setIfAbsent(key, value, ttlSeconds) ?? false;
    }
    try {
      const redis = await getRedisClient();
      const result = await redis.set(key, value, { ex: ttlSeconds, nx: true });
      return result === 'OK';
    } catch (error) {
      this.markUnavailable('SET NX', key, error);
      return this.fallback?.setIfAbsent(key, value, ttlSeconds) ?? false;
    }
  }

  async del(key: string): Promise<void> {
    if (this.isCircuitOpen()) {
      await this.fallback?.del(key);
      return;
    }
    try {
      const redis = await getRedisClient();
      await redis.del(key);
    } catch (error) {
      this.markUnavailable('DEL', key, error);
      await this.fallback?.del(key);
    }
  }
}

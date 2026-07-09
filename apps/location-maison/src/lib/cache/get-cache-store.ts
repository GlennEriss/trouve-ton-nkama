import type { CacheStore } from './cache-store.interface';
import { RedisCacheStore } from './redis-cache-store';
import { FirestoreCacheStore } from './firestore-cache-store';

/**
 * Sélecteur de stratégie de cache (Strategy pattern). Contrôlé par la variable
 * d'environnement CACHE_BACKEND :
 *   - "redis" (défaut) : comportement nominal, Upstash Redis.
 *   - "firestore" : repli temporaire, ex. le temps de régler un compte Upstash bloqué.
 *
 * Pour basculer temporairement sur Firestore : ajouter CACHE_BACKEND=firestore dans
 * .env.local (ou les variables d'environnement du déploiement), puis retirer la
 * variable (ou remettre "redis") une fois Upstash de nouveau disponible. Aucun code
 * appelant n'a besoin de changer — voir src/lib/cache/index.ts pour l'usage.
 */
let cachedStore: CacheStore | null = null;

export function getCacheStore(): CacheStore {
  if (cachedStore) {
    return cachedStore;
  }

  const backend = (process.env.CACHE_BACKEND ?? 'redis').trim().toLowerCase();
  cachedStore = backend === 'firestore' ? new FirestoreCacheStore() : new RedisCacheStore();
  return cachedStore;
}

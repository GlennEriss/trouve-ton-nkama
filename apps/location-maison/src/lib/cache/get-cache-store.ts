import type { CacheStore } from './cache-store.interface';
import { RedisCacheStore } from './redis-cache-store';
import { FirestoreCacheStore } from './firestore-cache-store';
import { MemoryCacheStore } from './memory-cache-store';

/**
 * Sélecteur de stratégie de cache (Strategy pattern). Contrôlé par la variable
 * d'environnement CACHE_BACKEND :
 *   - "redis" (défaut) : comportement nominal, Upstash Redis.
 *   - "firestore" : repli temporaire, ex. le temps de régler un compte Upstash bloqué.
 *   - "memory" : repli zéro-coût (aucune infra externe), ex. quand même Firestore
 *     n'est pas souhaitable pour un cache à très haute fréquence — voir
 *     memory-cache-store.ts pour les limites (non partagé entre instances, non
 *     persistant). N'est PAS le défaut : ce backend général sert des usages où un
 *     cache non partagé entre instances serait plus risqué (ex. compteurs affichés).
 *     Pour un cache dédié et volontairement mémoire (ex. proxy Algolia), instancier
 *     directement `new MemoryCacheStore()` plutôt que de passer par ce sélecteur.
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
  if (backend === 'firestore') {
    cachedStore = new FirestoreCacheStore();
  } else if (backend === 'memory') {
    cachedStore = new MemoryCacheStore();
  } else {
    cachedStore = new RedisCacheStore(new FirestoreCacheStore());
  }
  return cachedStore;
}

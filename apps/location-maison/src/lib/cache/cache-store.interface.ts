/**
 * @module cache/cache-store.interface
 *
 * Strategy interface pour le cache applicatif. Implémentations concrètes :
 * RedisCacheStore (nominal) et FirestoreCacheStore (repli temporaire quand
 * Upstash est indisponible, ex: compte bloqué pour impayé). Voir get-cache-store.ts
 * pour le choix de la stratégie active.
 *
 * Contrat volontairement best-effort : aucune méthode ne doit jamais rejeter/throw.
 * Le cache est un accélérateur, jamais une dépendance dure — une erreur de lecture/
 * écriture est loggée et traitée comme une absence de cache, jamais comme une panne
 * de la fonctionnalité qui l'utilise.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

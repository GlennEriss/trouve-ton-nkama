import type { CacheStore } from './cache-store.interface';

const DEFAULT_MAX_ENTRIES = 1000;

interface MemoryEntry<T> {
  value: T;
  expiresAtMs: number;
}

/**
 * Cache 100% en mémoire process (aucune infra externe, donc aucun coût et aucune
 * latence réseau). Repli volontaire pendant qu'Upstash Redis est suspendu (facture
 * impayée) — voir get-cache-store.ts pour le sélecteur de backend général, et
 * src/app/api/algolia/search/route.ts pour l'usage dédié (mutualiser les requêtes
 * Algolia identiques entre visiteurs).
 *
 * Limites assumées, acceptables pour cet usage : pas partagé entre instances serveur
 * (chaque process a son propre cache — sur un déploiement mono-instance, c'est un
 * partage complet ; sur plusieurs instances, un partage partiel, toujours mieux que
 * zéro partage), et vidé à chaque redémarrage. Contrairement à Redis/Firestore, ce
 * n'est pas fait pour survivre aux redéploiements — seulement pour absorber les pics
 * de trafic entre deux redémarrages.
 */
export class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, MemoryEntry<unknown>>();

  constructor(private readonly maxEntries: number = DEFAULT_MAX_ENTRIES) {}

  private isExpired(entry: MemoryEntry<unknown>): boolean {
    return entry.expiresAtMs <= Date.now();
  }

  private evictOldestIfFull(): void {
    if (this.store.size < this.maxEntries) return;
    // Map préserve l'ordre d'insertion : la première clé est la plus ancienne.
    const oldestKey = this.store.keys().next().value;
    if (oldestKey !== undefined) {
      this.store.delete(oldestKey);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Ré-insérer une clé existante la remet en fin d'ordre d'insertion (comportement
    // Map natif après delete+set), ce qui approxime un LRU pour l'éviction ci-dessus.
    this.store.delete(key);
    this.evictOldestIfFull();
    this.store.set(key, { value, expiresAtMs: Date.now() + ttlSeconds * 1000 });
  }

  async setIfAbsent<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    const existing = this.store.get(key);
    if (existing && !this.isExpired(existing)) {
      return false;
    }
    await this.set(key, value, ttlSeconds);
    return true;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

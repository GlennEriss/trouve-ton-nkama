import { createLogger } from '@/lib/logger';
import type { CacheStore } from './cache-store.interface';

const logger = createLogger('cache.firestore-store');

const CACHE_COLLECTION = '_cache_entries';

// Firestore n'accepte pas `undefined` dans un document — on nettoie récursivement
// avant écriture (même logique que ailleurs dans le codebase pour les écritures Firestore).
function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return value;
}

// Les clés de cache peuvent contenir des caractères invalides pour un ID de document
// Firestore (ex: "/"). On les remplace pour rester sûr sans dépendre du format exact
// des clés appelantes.
function toDocId(key: string): string {
  return key.replace(/\//g, '_');
}

async function getAdminDb() {
  const [{ adminApp }, { getFirestore, Timestamp }] = await Promise.all([
    import('@/firebase/admin'),
    import('firebase-admin/firestore'),
  ]);
  return { db: getFirestore(adminApp as any), Timestamp };
}

/**
 * Repli temporaire quand Upstash Redis est indisponible (ex: compte bloqué pour
 * impayé). Stocke les entrées de cache dans Firestore, collection `_cache_entries`.
 * Plus lent et plus coûteux que Redis (lecture/écriture Firestore facturées), mais
 * garde le site fonctionnel. Optionnel : configurer une politique TTL native
 * Firestore sur le champ `expiresAt` de cette collection (console Firebase) pour un
 * nettoyage automatique des entrées expirées — pas indispensable, `get()` filtre déjà
 * les entrées expirées de son côté.
 */
export class FirestoreCacheStore implements CacheStore {
  async get<T>(key: string): Promise<T | null> {
    try {
      const { db } = await getAdminDb();
      const snapshot = await db.collection(CACHE_COLLECTION).doc(toDocId(key)).get();

      if (!snapshot.exists) {
        return null;
      }

      const data = snapshot.data() as { value: T; expiresAt?: { toMillis(): number } } | undefined;
      if (!data) {
        return null;
      }

      const expiresAtMs = data.expiresAt?.toMillis?.() ?? 0;
      if (expiresAtMs <= Date.now()) {
        // Entrée périmée : traiter comme absente, et nettoyer sans bloquer la réponse.
        void snapshot.ref.delete().catch(() => {});
        return null;
      }

      return data.value ?? null;
    } catch (error) {
      logger.warn('Firestore cache GET failed', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const { db, Timestamp } = await getAdminDb();
      const expiresAt = Timestamp.fromMillis(Date.now() + ttlSeconds * 1000);

      await db
        .collection(CACHE_COLLECTION)
        .doc(toDocId(key))
        .set({
          value: stripUndefined(value),
          expiresAt,
        });
    } catch (error) {
      logger.warn('Firestore cache SET failed', { key, error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      const { db } = await getAdminDb();
      await db.collection(CACHE_COLLECTION).doc(toDocId(key)).delete();
    } catch (error) {
      logger.warn('Firestore cache DEL failed', { key, error });
    }
  }
}

import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import type { Property } from '@/models/annonce';
import { createLogger } from '@/lib/logger';
import {
  getCityConfig,
  getTransactionConfig,
  getTypeConfig,
  type PropertyTypeSlug,
  type TransactionSlug,
} from '@/lib/seo/landing-taxonomy';

const logger = createLogger('seo.public-listings');

export type PublicProperty = Property & {
  id: string;
};

function toMillis(value: unknown): number {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'object' && value !== null) {
    if ('toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
      try {
        return (value as { toMillis: () => number }).toMillis();
      } catch {
        return 0;
      }
    }

    const seconds = (value as { seconds?: unknown }).seconds;
    const nanoseconds = (value as { nanoseconds?: unknown }).nanoseconds;

    if (typeof seconds === 'number') {
      const millis = seconds * 1000 + (typeof nanoseconds === 'number' ? nanoseconds / 1_000_000 : 0);
      return Number.isFinite(millis) ? millis : 0;
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function mapDocToPublicProperty(id: string, data: unknown): PublicProperty | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const property = { ...(data as Property), id } as PublicProperty;
  return property.state === 'IN_PROGRESS' && property.moderationStatus === 'APPROVED' ? property : null;
}

async function getAdminDb() {
  const [{ adminApp }, { getFirestore }] = await Promise.all([
    import('@/firebase/admin'),
    import('firebase-admin/firestore'),
  ]);

  if (!adminApp) {
    logger.error('Firebase admin is not initialized');
    return null;
  }

  return getFirestore(adminApp as any);
}

export function getPropertyLastModified(property: PublicProperty): string {
  const updatedMillis = toMillis(property.updatedAt);
  const createdMillis = toMillis(property.createdAt);
  const lastModifiedMillis = Math.max(updatedMillis, createdMillis);

  if (lastModifiedMillis <= 0) {
    return new Date().toISOString();
  }

  return new Date(lastModifiedMillis).toISOString();
}

export async function getPublicPropertyById(id: string): Promise<PublicProperty | null> {
  try {
    const db = await getAdminDb();
    if (!db) {
      return null;
    }

    const snapshot = await db.collection(firebaseCollectionNames.properties).doc(id).get();
    if (!snapshot.exists) {
      return null;
    }

    return mapDocToPublicProperty(snapshot.id, snapshot.data());
  } catch (error) {
    logger.error('Failed to fetch public property by id', { id, error });
    return null;
  }
}

export async function listPublicPropertiesForSitemap(limit = 5000): Promise<PublicProperty[]> {
  try {
    const db = await getAdminDb();
    if (!db) {
      return [];
    }

    const snapshot = await db
      .collection(firebaseCollectionNames.properties)
      .where('state', '==', 'IN_PROGRESS')
      .where('moderationStatus', '==', 'APPROVED')
      .limit(limit)
      .get();

    return snapshot.docs
      .map((doc) => mapDocToPublicProperty(doc.id, doc.data()))
      .filter((property): property is PublicProperty => Boolean(property));
  } catch (error) {
    logger.error('Failed to fetch properties for sitemap', { error });
    return [];
  }
}

export async function listLandingProperties(options: {
  transaction: TransactionSlug;
  type: PropertyTypeSlug;
  citySlug?: string;
  limit?: number;
}): Promise<PublicProperty[]> {
  const { transaction, type, citySlug, limit = 12 } = options;
  const transactionConfig = getTransactionConfig(transaction);
  const typeConfig = getTypeConfig(type);
  const cityConfig = citySlug ? getCityConfig(citySlug) : null;

  if (!transactionConfig || !typeConfig || (citySlug && !cityConfig)) {
    return [];
  }

  try {
    const db = await getAdminDb();
    if (!db) {
      return [];
    }

    const snapshot = await db
      .collection(firebaseCollectionNames.properties)
      .where('state', '==', 'IN_PROGRESS')
      .where('status', '==', transactionConfig.status)
      .where('moderationStatus', '==', 'APPROVED')
      .limit(250)
      .get();

    const targetCity = normalizeText(cityConfig?.label ?? '');

    const filtered = snapshot.docs
      .map((doc) => mapDocToPublicProperty(doc.id, doc.data()))
      .filter((property): property is PublicProperty => Boolean(property))
      .filter((property) => typeConfig.typePropertyValues.includes(property.typeProperty))
      .filter((property) => (targetCity ? normalizeText(property.city) === targetCity : true))
      .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
      .slice(0, limit);

    return filtered;
  } catch (error) {
    logger.error('Failed to fetch landing properties', { transaction, type, citySlug, error });
    return [];
  }
}

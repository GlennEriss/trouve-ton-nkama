import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/next-auth/auth';
import { adminApp } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import { getFirestore } from 'firebase-admin/firestore';
import type { Property } from '@/models/annonce';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';

const logger = createLogger('api.announcer.ads');
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

type SortBy = 'createdAt' | 'updatedAt' | 'price' | 'title';
type SortOrder = 'asc' | 'desc';

type PropertyRecord = Property & {
  id: string;
};

function parseLimit(value: string | null): number {
  if (!value) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function parseCursor(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function parseSortBy(value: string | null): SortBy {
  if (value === 'updatedAt' || value === 'price' || value === 'title') {
    return value;
  }
  return 'createdAt';
}

function parseSortOrder(value: string | null): SortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

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
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function matchesQuery(property: PropertyRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = normalizeText(
    [
      property.title,
      property.description,
      property.city,
      property.province,
      property.street,
      property.typeProperty,
    ]
      .filter(Boolean)
      .join(' ')
  );

  return haystack.includes(query);
}

function isPromoted(property: PropertyRecord): boolean {
  const promotion = property.currentPromotion;
  if (!promotion?.isActive) {
    return false;
  }
  return toMillis(promotion.endDate) > Date.now();
}

function buildSummary(properties: PropertyRecord[]) {
  let active = 0;
  let archived = 0;
  let promoted = 0;
  let forRent = 0;
  let forSale = 0;

  for (const property of properties) {
    if (property.state === 'IN_PROGRESS') {
      active += 1;
    }
    if (property.state === 'ARCHIVED') {
      archived += 1;
    }
    if (property.status === 'FOR_RENT') {
      forRent += 1;
    }
    if (property.status === 'FOR_SALE') {
      forSale += 1;
    }
    if (isPromoted(property)) {
      promoted += 1;
    }
  }

  return {
    total: properties.length,
    active,
    archived,
    promoted,
    forRent,
    forSale,
  };
}

function compareProperties(left: PropertyRecord, right: PropertyRecord, sortBy: SortBy, sortOrder: SortOrder) {
  const direction = sortOrder === 'asc' ? 1 : -1;

  let comparison = 0;
  if (sortBy === 'price') {
    const leftPrice = typeof left.price === 'number' ? left.price : Number(left.price) || 0;
    const rightPrice = typeof right.price === 'number' ? right.price : Number(right.price) || 0;
    comparison = leftPrice - rightPrice;
  } else if (sortBy === 'title') {
    comparison = (left.title ?? '').localeCompare(right.title ?? '', 'fr', { sensitivity: 'base' });
  } else if (sortBy === 'updatedAt') {
    comparison = toMillis(left.updatedAt) - toMillis(right.updatedAt);
  } else {
    comparison = toMillis(left.createdAt) - toMillis(right.createdAt);
  }

  if (comparison === 0) {
    comparison = (left.id ?? '').localeCompare(right.id ?? '');
  }

  return comparison * direction;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const uid = session?.user?.uid;
    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentification requise.',
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const q = normalizeText(searchParams.get('q'));
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const state = searchParams.get('state') || '';
    const promoted = searchParams.get('promoted') || '';
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const sortBy = parseSortBy(searchParams.get('sortBy'));
    const sortOrder = parseSortOrder(searchParams.get('sortOrder'));
    const limit = parseLimit(searchParams.get('limit'));
    const cursor = parseCursor(searchParams.get('cursor'));

    const minPrice = priceMin ? Number(priceMin) : Number.NaN;
    const maxPrice = priceMax ? Number(priceMax) : Number.NaN;

    const db = getFirestore(adminApp as any);
    const snapshot = await db
      .collection(firebaseCollectionNames.properties)
      .where('createdBy', '==', uid)
      .get();

    const allItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Property),
    })) as PropertyRecord[];

    const globalSummary = buildSummary(allItems);

    const filteredItems = allItems
      .filter((property) => !type || property.typeProperty === type)
      .filter((property) => !status || property.status === status)
      .filter((property) => !state || property.state === state)
      .filter((property) => {
        if (!promoted) {
          return true;
        }
        const promotedValue = promoted === 'true';
        return promotedValue ? isPromoted(property) : !isPromoted(property);
      })
      .filter((property) => (Number.isFinite(minPrice) ? Number(property.price) >= minPrice : true))
      .filter((property) => (Number.isFinite(maxPrice) ? Number(property.price) <= maxPrice : true))
      .filter((property) => matchesQuery(property, q))
      .sort((left, right) => compareProperties(left, right, sortBy, sortOrder));

    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < total ? String(cursor + limit) : null;

    const filteredSummary = buildSummary(filteredItems);

    return NextResponse.json({
      success: true,
      items: paginatedItems,
      pagination: {
        total,
        limit,
        cursor: String(cursor),
        nextCursor,
        hasMore: nextCursor !== null,
      },
      summary: {
        global: globalSummary,
        filtered: filteredSummary,
      },
      appliedFilters: {
        q: searchParams.get('q') ?? '',
        type,
        status,
        state,
        promoted,
        priceMin: Number.isFinite(minPrice) ? minPrice : null,
        priceMax: Number.isFinite(maxPrice) ? maxPrice : null,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch announcer ads', { error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Impossible de récupérer vos annonces pour le moment.',
        },
      },
      { status: 500 }
    );
  }
}

import type { StatusProperty } from '@/models/annonce';

export type TransactionSlug = 'location' | 'vente';
export type PropertyTypeSlug = 'maison' | 'appartement' | 'studio' | 'villa' | 'terrain';

type TransactionConfig = {
  slug: TransactionSlug;
  label: string;
  proposition: string;
  status: StatusProperty;
};

type TypeConfig = {
  slug: PropertyTypeSlug;
  singularLabel: string;
  pluralLabel: string;
  typePropertyValues: string[];
};

type CityConfig = {
  slug: string;
  label: string;
};

const TRANSACTION_CONFIG: Record<TransactionSlug, TransactionConfig> = {
  location: {
    slug: 'location',
    label: 'location',
    proposition: 'à louer',
    status: 'FOR_RENT',
  },
  vente: {
    slug: 'vente',
    label: 'vente',
    proposition: 'à vendre',
    status: 'FOR_SALE',
  },
};

const TYPE_CONFIG: Record<PropertyTypeSlug, TypeConfig> = {
  maison: {
    slug: 'maison',
    singularLabel: 'Maison',
    pluralLabel: 'Maisons',
    typePropertyValues: ['home'],
  },
  appartement: {
    slug: 'appartement',
    singularLabel: 'Appartement',
    pluralLabel: 'Appartements',
    typePropertyValues: ['apartment'],
  },
  studio: {
    slug: 'studio',
    singularLabel: 'Studio',
    pluralLabel: 'Studios',
    typePropertyValues: ['studio'],
  },
  villa: {
    slug: 'villa',
    singularLabel: 'Villa',
    pluralLabel: 'Villas',
    typePropertyValues: ['villa'],
  },
  terrain: {
    slug: 'terrain',
    singularLabel: 'Terrain',
    pluralLabel: 'Terrains',
    typePropertyValues: ['land'],
  },
};

export const LANDING_CITIES: CityConfig[] = [
  { slug: 'libreville', label: 'Libreville' },
  { slug: 'port-gentil', label: 'Port-Gentil' },
  { slug: 'franceville', label: 'Franceville' },
  { slug: 'owendo', label: 'Owendo' },
  { slug: 'akanda', label: 'Akanda' },
  { slug: 'oyem', label: 'Oyem' },
  { slug: 'mouila', label: 'Mouila' },
];

export const LANDING_TRANSACTIONS = Object.keys(TRANSACTION_CONFIG) as TransactionSlug[];
export const LANDING_TYPES = Object.keys(TYPE_CONFIG) as PropertyTypeSlug[];

export function getTransactionConfig(slug: string): TransactionConfig | null {
  return TRANSACTION_CONFIG[slug as TransactionSlug] ?? null;
}

export function getTypeConfig(slug: string): TypeConfig | null {
  return TYPE_CONFIG[slug as PropertyTypeSlug] ?? null;
}

export function getCityConfig(slug: string): CityConfig | null {
  return LANDING_CITIES.find((city) => city.slug === slug) ?? null;
}

export function getGlobalLandingPath(transaction: TransactionSlug, type: PropertyTypeSlug): string {
  return `/immobilier/${transaction}/${type}`;
}

export function getCityLandingPath(transaction: TransactionSlug, type: PropertyTypeSlug, citySlug: string): string {
  return `/immobilier/${transaction}/${type}/${citySlug}`;
}

import { apiFetch } from './client';
import type { PropertyImage } from '../lib/propertyImage';

export type PropertyDetail = {
  id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  typeProperty: string;
  status: 'FOR_RENT' | 'FOR_SALE';
  city: string;
  province: string;
  // Zones multiples (Mode, etc.) — voir docs/marketplace-multi-categories/
  // 08-zones-multiples-mode.md. Absent sur l'immobilier et sur une annonce Mode créée avant
  // ce champ (repli sur `city` géré par formatListingZones, lib/listingZones.ts).
  cities?: string[];
  street?: string;
  images: PropertyImage[];
  nbrRooms?: number;
  nbrBathrooms?: number;
  contact?: string;
  whatsappContact?: string;
  callContact?: string;
  additionalContacts?: string[];
};

export async function getPropertyById(id: string): Promise<PropertyDetail> {
  return apiFetch<PropertyDetail>(`/api/property/id?id=${encodeURIComponent(id)}`);
}

// Champs communs aux annonces listées sur l'accueil (carousels + liste récente) — sous-ensemble
// de PropertyDetail, mêmes noms de champs (même modèle Property côté backend, voir
// apps/location-maison/src/models/annonce.d.ts).
export type PropertyListItem = {
  id: string;
  title: string;
  price: number;
  status: 'FOR_RENT' | 'FOR_SALE';
  city: string;
  province: string;
  cities?: string[];
  typeProperty: string;
  images: PropertyImage[];
};

export type PromotedProperties = {
  featured: PropertyListItem[];
  trending: PropertyListItem[];
};

// Même endpoint que FeaturedSection/TrendingSection (web) — annonces mises en avant par
// l'admin (voir Promotion dans annonce.d.ts), pas une sélection inventée côté mobile.
export async function getPromotedProperties(): Promise<PromotedProperties> {
  const data = await apiFetch<{ featuredProperties?: PropertyListItem[]; trendingProperties?: PropertyListItem[] }>(
    '/api/property/promoted',
  );
  return { featured: data.featuredProperties ?? [], trending: data.trendingProperties ?? [] };
}

// Même endpoint que RecentSection (web).
export async function listRecentProperties(limitPerPage = 10): Promise<PropertyListItem[]> {
  const data = await apiFetch<{ properties?: PropertyListItem[] }>(`/api/property/list?limitPerPage=${limitPerPage}`);
  return data.properties ?? [];
}

// Même endpoint que useServerPropertyCountSummary (web), utilisé par PropertyByProvince.
export async function getPropertyCountByProvince(): Promise<Record<string, number>> {
  const data = await apiFetch<{ byProvince?: Record<string, number> }>('/api/property/count/summary');
  return data.byProvince ?? {};
}

export type HomeSection = {
  id: string;
  slug: string;
  name: string;
  items: PropertyListItem[];
};

// Même endpoint que CategoryHomeSections (web) — un rail par catégorie racine active (au moins
// "Immobilier", et "Mode" dès qu'elle a du stock, voir marketplace multi-catégories), jamais
// une liste de catégories codée en dur côté mobile.
export async function getHomeSections(): Promise<HomeSection[]> {
  const data = await apiFetch<{ sections?: HomeSection[] }>('/api/categories/home-sections');
  return data.sections ?? [];
}

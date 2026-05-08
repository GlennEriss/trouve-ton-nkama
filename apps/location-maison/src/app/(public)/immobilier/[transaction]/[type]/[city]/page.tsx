import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ImmobilierLandingPage from '@/components/seo/ImmobilierLandingPage';
import { searchLandingProperties } from '@/lib/seo/algolia-listings';
import { withCanonical } from '@/lib/seo/metadata';
import {
  LANDING_CITIES,
  LANDING_TRANSACTIONS,
  LANDING_TYPES,
  getCityConfig,
  getCityLandingPath,
  getGlobalLandingPath,
  getTransactionConfig,
  getTypeConfig,
} from '@/lib/seo/landing-taxonomy';
import { canonical } from '@/lib/seo/site-url';

type PageParams = Promise<{ transaction: string; type: string; city: string }>;
type PageSearchParams = Promise<{ page?: string | string[] }>;
export const revalidate = 3600;

function buildSearchHref(status: string, typePropertyValue: string, cityLabel: string): string {
  return `/search?status=${encodeURIComponent(status)}&typeProperty=${encodeURIComponent(typePropertyValue)}&city=${encodeURIComponent(cityLabel)}`;
}

function parsePage(rawPage: string | string[] | undefined): number {
  const raw = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  if (!raw) return 1;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function withPageQuery(path: string, page: number): string {
  return page > 1 ? `${path}?page=${encodeURIComponent(page)}` : path;
}

export function generateStaticParams() {
  return LANDING_TRANSACTIONS.flatMap((transaction) =>
    LANDING_TYPES.flatMap((type) =>
      LANDING_CITIES.map((city) => ({
        transaction,
        type,
        city: city.slug,
      }))
    )
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const { transaction, type, city } = await params;
  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams.page);
  const transactionConfig = getTransactionConfig(transaction);
  const typeConfig = getTypeConfig(type);
  const cityConfig = getCityConfig(city);

  if (!transactionConfig || !typeConfig || !cityConfig) {
    return {};
  }

  const baseTitle = `${typeConfig.pluralLabel} ${transactionConfig.proposition} à ${cityConfig.label}`;
  const title = page > 1 ? `${baseTitle} - Page ${page} | Trouve Ton Nkama` : `${baseTitle} | Trouve Ton Nkama`;
  const description = `Explorez les ${typeConfig.pluralLabel.toLowerCase()} ${transactionConfig.proposition} à ${cityConfig.label}, Gabon. Annonces vérifiées, prix en FCFA et contact direct annonceur sur Trouve Ton Nkama.`;
  const path = getCityLandingPath(transactionConfig.slug, typeConfig.slug, cityConfig.slug);
  const canonicalPath = withPageQuery(path, page);

  return withCanonical(
    {
      title,
      description,
      openGraph: {
        title,
        description,
        url: canonical(canonicalPath),
        type: 'website',
      },
    },
    canonicalPath
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const { transaction, type, city } = await params;
  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams.page);
  const transactionConfig = getTransactionConfig(transaction);
  const typeConfig = getTypeConfig(type);
  const cityConfig = getCityConfig(city);

  if (!transactionConfig || !typeConfig || !cityConfig) {
    notFound();
  }

  const path = getCityLandingPath(transactionConfig.slug, typeConfig.slug, cityConfig.slug);
  const paginatedPath = withPageQuery(path, page);
  const globalPath = getGlobalLandingPath(transactionConfig.slug, typeConfig.slug);
  const propertiesResults = await searchLandingProperties({
    transaction: transactionConfig.slug,
    type: typeConfig.slug,
    citySlug: cityConfig.slug,
    page,
    hitsPerPage: 18,
  });

  if (propertiesResults.totalPages > 0 && page > propertiesResults.totalPages) {
    notFound();
  }

  const title = `${typeConfig.pluralLabel} ${transactionConfig.proposition} à ${cityConfig.label}`;
  const description = `Retrouvez les meilleures annonces de ${typeConfig.pluralLabel.toLowerCase()} ${transactionConfig.proposition} à ${cityConfig.label}, avec prix, photos et informations détaillées.`;

  const cityLandingLinks = LANDING_CITIES.map((cityEntry) => ({
    href: getCityLandingPath(transactionConfig.slug, typeConfig.slug, cityEntry.slug),
    label: `${typeConfig.singularLabel} ${transactionConfig.proposition} à ${cityEntry.label}`,
  }));

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical(paginatedPath),
    about: `Immobilier ${cityConfig.label} - ${typeConfig.pluralLabel} ${transactionConfig.proposition}`,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: canonical('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Immobilier',
        item: canonical('/immobilier'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${typeConfig.pluralLabel} ${transactionConfig.proposition}`,
        item: canonical(globalPath),
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: cityConfig.label,
        item: canonical(paginatedPath),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ImmobilierLandingPage
        title={title}
        description={description}
        transactionLabel={transactionConfig.label}
        typeLabel={typeConfig.singularLabel}
        cityLabel={cityConfig.label}
        properties={propertiesResults.items}
        globalLandingPath={globalPath}
        searchHref={buildSearchHref(transactionConfig.status, typeConfig.typePropertyValues[0], cityConfig.label)}
        cityLandingLinks={cityLandingLinks}
        pageBasePath={path}
        currentPage={propertiesResults.currentPage}
        totalPages={propertiesResults.totalPages}
        totalHits={propertiesResults.totalHits}
      />
    </>
  );
}

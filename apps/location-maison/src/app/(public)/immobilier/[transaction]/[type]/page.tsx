import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ImmobilierLandingPage from '@/components/seo/ImmobilierLandingPage';
import { withCanonical } from '@/lib/seo/metadata';
import {
  LANDING_CITIES,
  LANDING_TRANSACTIONS,
  LANDING_TYPES,
  getCityLandingPath,
  getGlobalLandingPath,
  getTransactionConfig,
  getTypeConfig,
} from '@/lib/seo/landing-taxonomy';
import { listLandingProperties } from '@/lib/seo/public-listings';
import { canonical } from '@/lib/seo/site-url';

type PageParams = Promise<{ transaction: string; type: string }>;
export const revalidate = 3600;

function buildSearchHref(status: string, typePropertyValue: string): string {
  return `/search?status=${encodeURIComponent(status)}&typeProperty=${encodeURIComponent(typePropertyValue)}`;
}

export function generateStaticParams() {
  return LANDING_TRANSACTIONS.flatMap((transaction) =>
    LANDING_TYPES.map((type) => ({
      transaction,
      type,
    }))
  );
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { transaction, type } = await params;
  const transactionConfig = getTransactionConfig(transaction);
  const typeConfig = getTypeConfig(type);

  if (!transactionConfig || !typeConfig) {
    return {};
  }

  const title = `${typeConfig.pluralLabel} ${transactionConfig.proposition} au Gabon | Trouve Ton Nkama`;
  const description = `Découvrez les ${typeConfig.pluralLabel.toLowerCase()} ${transactionConfig.proposition} au Gabon sur Trouve Ton Nkama. Consultez les annonces disponibles, comparez les prix et contactez directement les annonceurs.`;
  const path = getGlobalLandingPath(transactionConfig.slug, typeConfig.slug);

  return withCanonical(
    {
      title,
      description,
      openGraph: {
        title,
        description,
        url: canonical(path),
        type: 'website',
      },
    },
    path
  );
}

export default async function Page({ params }: { params: PageParams }) {
  const { transaction, type } = await params;
  const transactionConfig = getTransactionConfig(transaction);
  const typeConfig = getTypeConfig(type);

  if (!transactionConfig || !typeConfig) {
    notFound();
  }

  const path = getGlobalLandingPath(transactionConfig.slug, typeConfig.slug);
  const properties = await listLandingProperties({
    transaction: transactionConfig.slug,
    type: typeConfig.slug,
    limit: 18,
  });

  const title = `${typeConfig.pluralLabel} ${transactionConfig.proposition} au Gabon`;
  const description = `Consultez notre sélection de ${typeConfig.pluralLabel.toLowerCase()} ${transactionConfig.proposition} partout au Gabon: Libreville, Port-Gentil, Franceville et plus.`;

  const cityLandingLinks = LANDING_CITIES.map((city) => ({
    href: getCityLandingPath(transactionConfig.slug, typeConfig.slug, city.slug),
    label: `${typeConfig.singularLabel} ${transactionConfig.proposition} à ${city.label}`,
  }));

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical(path),
    about: `Immobilier Gabon - ${typeConfig.pluralLabel} ${transactionConfig.proposition}`,
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
        item: canonical(path),
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
        properties={properties}
        globalLandingPath={path}
        searchHref={buildSearchHref(transactionConfig.status, typeConfig.typePropertyValues[0])}
        cityLandingLinks={cityLandingLinks}
      />
    </>
  );
}

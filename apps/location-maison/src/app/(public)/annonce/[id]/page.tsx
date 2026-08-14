import HouseDetails from '@/components/preview-property/HouseDetails'
import type { Metadata } from 'next';
import React from 'react'
import { createLogger } from '@/lib/logger'
import { notFound } from 'next/navigation';
import { absoluteUrl, canonical } from '@/lib/seo/site-url';
import { getPropertyLastModified, getPublicPropertyById } from '@/lib/seo/public-listings';
import { buildListingShareTitle } from '@/lib/seo/listing-share';

const logger = createLogger('app.annonce.page')
type AnnonceParams = Promise<{ id: string }>;

function buildCanonicalPath(id: string): string {
  return `/annonce/${id}`;
}

export async function generateMetadata({ params }: { params: AnnonceParams }): Promise<Metadata> {
  const { id } = await params;

  try {
    const property = await getPublicPropertyById(id);
    const canonicalUrl = canonical(buildCanonicalPath(id));

    if (!property) {
      return {
        title: 'Annonce introuvable | Trouve Ton Nkama',
        description: "Cette annonce n'est plus disponible sur Trouve Ton Nkama.",
        alternates: {
          canonical: canonicalUrl,
        },
        robots: {
          index: false,
          follow: true,
        },
      };
    }

    // og:title/description enrichis prix + quartier : WhatsApp/Facebook n'affichent que
    // l'image + ces deux champs (souvent tronqués), donc le prix et le quartier doivent y
    // être explicitement plutôt que de compter sur le titre libre saisi par l'annonceur.
    const shareTitle = buildListingShareTitle(property);
    // Image composée (photo + bandeau prix/quartier), voir src/app/api/og/property/[id]/route.tsx.
    const ogImage = absoluteUrl(`/api/og/property/${id}`);

    return {
      title: property.title,
      description: property.description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: shareTitle,
        description: property.description,
        url: canonicalUrl,
        type: 'article',
        images: [{ url: ogImage, width: 1200, height: 630, alt: shareTitle }],
      },
      twitter: {
        card: 'summary_large_image',
        title: shareTitle,
        description: property.description,
        images: [ogImage],
      },
    };
  } catch (error) {
    logger.error('Error fetching metadata', { error, id });
    return {};
  }
}

export default async function Page({ params }: { params: AnnonceParams }) {
  const { id } = await params;
  const property = await getPublicPropertyById(id);

  if (!property) {
    notFound();
  }

  // Structured data immobilier (RealEstateListing) — les catégories hors immobilier
  // (mode, etc.) n'atteignent pas encore cette page en production (Lot 2 les garde en
  // PENDING, Lot 5 n'expose Mode nulle part tant qu'elle n'est pas activée) ; migrer vers
  // Product/Offer par catégorie est un chantier à part, voir
  // docs/marketplace-multi-categories/04-page-detail.md.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description,
    url: canonical(buildCanonicalPath(id)),
    datePosted: getPropertyLastModified(property),
    offers: {
      '@type': property.status === 'FOR_RENT' ? 'OfferForLease' : 'Offer',
      priceCurrency: 'XAF',
      price: property.price,
      availability: 'https://schema.org/InStock',
      businessFunction:
        property.status === 'FOR_RENT'
          ? 'http://purl.org/goodrelations/v1#LeaseOut'
          : 'http://purl.org/goodrelations/v1#Sell',
    },
    itemOffered: {
      '@type': 'Accommodation',
      name: property.title,
      floorSize: property.area
        ? {
            '@type': 'QuantitativeValue',
            value: property.area,
            unitCode: 'MTK',
          }
        : undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: property.city,
        addressRegion: property.province,
        addressCountry: property.countryCode || 'GA',
      },
      numberOfRooms: (property as { nbrRooms?: number }).nbrRooms,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <HouseDetails />
    </>
  );
}

import Link from 'next/link';
import ImmobilierPropertyCardsGrid from '@/components/seo/ImmobilierPropertyCardsGrid';
import type { LandingPropertyCard } from '@/lib/seo/algolia-listings';

type QuickLink = {
  href: string;
  label: string;
};

type ImmobilierLandingPageProps = {
  title: string;
  description: string;
  transactionLabel: string;
  typeLabel: string;
  cityLabel?: string;
  properties: LandingPropertyCard[];
  globalLandingPath: string;
  searchHref: string;
  cityLandingLinks: QuickLink[];
  totalPages: number;
  totalHits: number;
};

export default function ImmobilierLandingPage({
  title,
  description,
  transactionLabel,
  typeLabel,
  cityLabel,
  properties,
  globalLandingPath,
  searchHref,
  cityLandingLinks,
  totalPages,
  totalHits,
}: ImmobilierLandingPageProps) {
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(0, Math.trunc(totalPages)) : 0;
  const safeTotalHits = Number.isFinite(totalHits) ? Math.max(0, Math.trunc(totalHits)) : 0;
  const hasMoreResults = safeTotalPages > 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-[1280px] 2xl:max-w-[1440px] mx-auto space-y-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h1 className="text-3xl md:text-4xl font-bold text-[#146B67]">{title}</h1>
            <p className="mt-4 text-base md:text-lg text-gray-700 leading-relaxed">{description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={searchHref}
                className="inline-flex items-center rounded-full bg-[#146B67] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f5a57] transition-colors"
              >
                Ouvrir les résultats filtrés
              </Link>
              {cityLabel ? (
                <Link
                  href={globalLandingPath}
                  className="inline-flex items-center rounded-full border border-[#146B67] px-5 py-2.5 text-sm font-semibold text-[#146B67] hover:bg-[#146B67] hover:text-white transition-colors"
                >
                  Voir tout le Gabon
                </Link>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-[#146B67]">
              {safeTotalHits > 0
                ? `${safeTotalHits} annonces ${transactionLabel} ${typeLabel.toLowerCase()} ${cityLabel ? `à ${cityLabel}` : 'au Gabon'}`
                : `Aucune annonce ${transactionLabel} ${typeLabel.toLowerCase()} ${cityLabel ? `à ${cityLabel}` : 'au Gabon'} pour le moment`}
            </h2>
            {properties.length > 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                Cliquez sur une annonce pour voir les détails complets.
              </p>
            ) : null}

            {properties.length > 0 ? (
              <ImmobilierPropertyCardsGrid properties={properties} />
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                Cette page sera automatiquement enrichie dès qu&apos;une nouvelle annonce correspondante sera publiée.
              </div>
            )}

            {hasMoreResults ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={searchHref}
                  className="inline-flex items-center rounded-full border border-[#146B67] px-6 py-2.5 text-sm font-semibold text-[#146B67] hover:bg-[#146B67] hover:text-white transition-colors"
                >
                  Voir plus d&apos;annonces
                </Link>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-[#146B67]">Explorer par ville</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {cityLandingLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:border-[#146B67] hover:text-[#146B67] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

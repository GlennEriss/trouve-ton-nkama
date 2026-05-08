import Link from 'next/link';
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
  pageBasePath: string;
  currentPage: number;
  totalPages: number;
  totalHits: number;
};

function formatPrice(price: number | string | undefined): string {
  const numericPrice = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(numericPrice)) {
    return 'Prix sur demande';
  }
  return `${numericPrice.toLocaleString('fr-FR')} FCFA`;
}

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
  pageBasePath,
  currentPage,
  totalPages,
  totalHits,
}: ImmobilierLandingPageProps) {
  const safePage = Number.isFinite(currentPage) ? Math.max(1, Math.trunc(currentPage)) : 1;
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(0, Math.trunc(totalPages)) : 0;
  const safeTotalHits = Number.isFinite(totalHits) ? Math.max(0, Math.trunc(totalHits)) : 0;
  const canPaginate = safeTotalPages > 1;

  const buildPageHref = (page: number): string =>
    page <= 1 ? pageBasePath : `${pageBasePath}?page=${encodeURIComponent(page)}`;

  const visiblePages = Array.from(
    new Set([1, safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2, safeTotalPages])
  )
    .filter((page) => page >= 1 && page <= safeTotalPages)
    .sort((a, b) => a - b);

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
            {canPaginate ? (
              <p className="mt-2 text-sm text-gray-600">
                Page {safePage} sur {safeTotalPages}
              </p>
            ) : null}

            {properties.length > 0 ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => {
                  const firstImage = property.images?.[0];
                  const imageUrl =
                    typeof firstImage === 'string' ? firstImage : firstImage && 'fileURL' in firstImage ? firstImage.fileURL : undefined;

                  return (
                    <article
                      key={property.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={property.title}
                          className="h-44 w-full rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-44 w-full rounded-lg bg-gray-100" />
                      )}
                      <h3 className="mt-4 text-lg font-semibold text-gray-900 line-clamp-2">
                        <Link href={property.detailsHref} className="hover:text-[#146B67] transition-colors">
                          {property.title}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{property.description}</p>
                      <p className="mt-3 text-sm font-semibold text-[#146B67]">{formatPrice(property.price)}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {property.city}, {property.province}
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                Cette page sera automatiquement enrichie dès qu&apos;une nouvelle annonce correspondante sera publiée.
              </div>
            )}

            {canPaginate ? (
              <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Pagination des annonces immobilières">
                <Link
                  href={buildPageHref(Math.max(1, safePage - 1))}
                  aria-disabled={safePage <= 1}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    safePage <= 1
                      ? 'pointer-events-none border-gray-200 text-gray-400'
                      : 'border-gray-300 text-gray-700 hover:border-[#146B67] hover:text-[#146B67]'
                  }`}
                >
                  Precedent
                </Link>

                {visiblePages.map((page) => (
                  <Link
                    key={page}
                    href={buildPageHref(page)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      page === safePage
                        ? 'border-[#146B67] bg-[#146B67] text-white'
                        : 'border-gray-300 text-gray-700 hover:border-[#146B67] hover:text-[#146B67]'
                    }`}
                  >
                    {page}
                  </Link>
                ))}

                <Link
                  href={buildPageHref(Math.min(safeTotalPages, safePage + 1))}
                  aria-disabled={safePage >= safeTotalPages}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    safePage >= safeTotalPages
                      ? 'pointer-events-none border-gray-200 text-gray-400'
                      : 'border-gray-300 text-gray-700 hover:border-[#146B67] hover:text-[#146B67]'
                  }`}
                >
                  Suivant
                </Link>
              </nav>
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

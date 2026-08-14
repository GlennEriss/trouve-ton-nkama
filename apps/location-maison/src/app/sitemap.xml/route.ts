import { routes } from '@/constantes/routes'
import { createLogger } from '@/lib/logger'
import { getSiteOrigin } from '@/lib/seo/site-url';
import { getPropertyLastModified, listPublicPropertiesForSitemap } from '@/lib/seo/public-listings';
import {
  LANDING_CITIES,
  LANDING_TRANSACTIONS,
  LANDING_TYPES,
  getCityLandingPath,
  getGlobalLandingPath,
} from '@/lib/seo/landing-taxonomy';

const logger = createLogger('app.sitemap')
export const revalidate = 3600;

type SitemapEntry = {
  path: string;
  lastmod: string;
  priority?: string;
};

export async function GET() {
  const baseUrl = getSiteOrigin().replace(/\/$/, '')

  // Vérifier que l'URL de base est valide
  if (!baseUrl || !baseUrl.startsWith('http')) {
    logger.error('NEXT_PUBLIC_HOST invalide', { host: baseUrl })
    return new Response('Sitemap non disponible', { status: 500 })
  }

  const todayISO = new Date().toISOString()
  const staticEntries: SitemapEntry[] = [
    { path: routes.public_google.homePage, lastmod: todayISO, priority: '1.0' },
    { path: routes.public_google.immobilier, lastmod: todayISO },
    { path: routes.public_google.search, lastmod: todayISO },
    { path: routes.public_google.search_requests, lastmod: todayISO },
    { path: routes.public_google.blog, lastmod: todayISO },
    { path: routes.public_google.blog_tendances_marche, lastmod: todayISO },
    { path: routes.public_google.blog_financement, lastmod: todayISO },
    { path: routes.public_google.blog_commissions_demarcheurs, lastmod: todayISO },
    { path: routes.public_google.blog_structurer_annonces, lastmod: todayISO },
    { path: routes.public_google.blog_proptech, lastmod: todayISO },
    { path: routes.public_google.blog_guide_quartiers_libreville, lastmod: todayISO },
    { path: routes.public_google.blog_guide_quartiers_port_gentil, lastmod: todayISO },
    { path: routes.public_google.blog_rentabilite_immobiliere, lastmod: todayISO },
    { path: routes.public_google.blog_actualites_immobilieres, lastmod: todayISO },
    { path: routes.public_google.blog_conseils_negociation, lastmod: todayISO },
    { path: routes.public_google.blog_demarches_administratives, lastmod: todayISO },
    { path: routes.public_google.guide_immobilier_gabon, lastmod: todayISO },
    { path: routes.public_google.confidentiality, lastmod: todayISO },
    { path: routes.public_google.terms_of_use, lastmod: todayISO },
    { path: routes.public_google.announcer_terms, lastmod: todayISO },
    { path: routes.public.data_deletion, lastmod: todayISO },
  ];

  const landingEntries: SitemapEntry[] = [];
  for (const transaction of LANDING_TRANSACTIONS) {
    for (const type of LANDING_TYPES) {
      landingEntries.push({
        path: getGlobalLandingPath(transaction, type),
        lastmod: todayISO,
      });

      for (const city of LANDING_CITIES) {
        landingEntries.push({
          path: getCityLandingPath(transaction, type, city.slug),
          lastmod: todayISO,
        });
      }
    }
  }

  const properties = await listPublicPropertiesForSitemap();
  const propertyEntries: SitemapEntry[] = properties.map((property) => ({
    path: `/annonce/${property.id}`,
    lastmod: getPropertyLastModified(property),
  }));

  const uniqueEntries = new Map<string, SitemapEntry>();
  for (const entry of [...staticEntries, ...landingEntries, ...propertyEntries]) {
    if (!uniqueEntries.has(entry.path)) {
      uniqueEntries.set(entry.path, entry);
    }
  }

  const entries = Array.from(uniqueEntries.values());

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => `  <url>
    <loc>${baseUrl}${entry.path}</loc>
    <lastmod>${entry.lastmod}</lastmod>${entry.priority ? `\n    <priority>${entry.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}

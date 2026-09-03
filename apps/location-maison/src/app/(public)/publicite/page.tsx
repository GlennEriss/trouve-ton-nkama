import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'
import { canonical } from '@/lib/seo/site-url'
import { routes } from '@/constantes/routes'
import { type CreditPackData } from '@/lib/credits/credit-packs'
import { buildPublicAdPlans, getEntryPriceLabel } from '@/components/publicite/pricing'
import { FAQ_ITEMS } from '@/components/publicite/content'
import PubliciteLandingClient from '@/components/publicite/PubliciteLandingClient'

export const revalidate = 3600

const TITLE = 'Publicité au Gabon dès 3 750 FCFA | Trouve Ton Nkama'
const DESCRIPTION =
  'Faites connaître votre entreprise au public gabonais avec une publicité image ou vidéo sur Trouve Ton Nkama. Campagnes dès 3 750 FCFA.'

export const metadata: Metadata = withCanonical(
  {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      'faire de la publicité au Gabon',
      'campagne publicitaire Gabon',
      'publicité en ligne Gabon',
      'promouvoir son entreprise au Gabon',
      'publicité vidéo Gabon',
      'faire connaître son commerce à Libreville',
    ],
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: canonical(routes.public.publicite),
      type: 'website',
      images: [{ url: canonical('/images/publicite/og-image.jpg'), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [canonical('/images/publicite/og-image.jpg')],
    },
  },
  routes.public.publicite,
)

/**
 * Lit les packs de crédits actifs directement en base (Admin SDK, comme
 * `src/lib/seo/public-listings.ts` pour les autres pages publiques servies côté serveur) —
 * PAS via `/api/credits/packs` qui exige une session (route pensée pour l'espace connecté).
 * Repli sur `ADMIN_PACKS_TEMPLATE` (via buildPublicAdPlans) si la lecture échoue ou si aucun
 * pack actif n'est configuré.
 */
async function getActiveCreditPacks(): Promise<CreditPackData[]> {
  try {
    const [{ adminApp }, { getFirestore }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ])
    if (!adminApp) return []

    const db = getFirestore(adminApp as any)
    const snapshot = await db.collection('credit_packs').get()
    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as Partial<CreditPackData>
        const credits = Number(data.credits)
        const price = Number(data.price)
        if (!Number.isFinite(credits) || credits <= 0 || !Number.isFinite(price) || price <= 0) {
          return null
        }
        if (data.isActive === false) return null
        return { id: doc.id, name: String(data.name ?? doc.id), credits, price } as CreditPackData
      })
      .filter((pack): pack is CreditPackData => pack !== null)
  } catch {
    return []
  }
}

export default async function PublicitePage() {
  const activePacks = await getActiveCreditPacks()
  const plans = buildPublicAdPlans(activePacks)
  const entryPriceLabel = getEntryPriceLabel(plans)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: canonical('/') },
      { '@type': 'ListItem', position: 2, name: 'Publicité', item: canonical(routes.public.publicite) },
    ],
  }

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Trouve Ton Nkama Publicité',
    serviceType: 'Publicité en ligne locale',
    areaServed: {
      '@type': 'Country',
      name: 'Gabon',
    },
    provider: {
      '@type': 'Organization',
      name: 'Trouve Ton Nkama',
      url: canonical('/'),
    },
    url: canonical(routes.public.publicite),
    description: DESCRIPTION,
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.priceXaf,
      priceCurrency: 'XAF',
      description: plan.description,
      url: canonical(routes.public.publicite),
    })),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PubliciteLandingClient plans={plans} entryPriceLabel={entryPriceLabel} />
    </>
  )
}

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import PubliciteLandingClient from '@/components/publicite/PubliciteLandingClient'
import { buildPublicAdPlans } from '@/components/publicite/pricing'

// Même pattern que carousel-property-type.test.tsx : motion.* rendu comme des balises simples,
// useReducedMotion neutre — les animations elles-mêmes (réelles, framer-motion) sont vérifiées
// visuellement/en e2e, pas ici.
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  useReducedMotion: () => false,
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img alt={props.alt} src={props.src} />,
}))

const trackEvent = jest.fn()
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: {
    PUBLICITE_CTA_CLICKED: 'publicite_cta_clicked',
    PUBLICITE_PRICING_VIEWED: 'publicite_pricing_viewed',
    PUBLICITE_VIDEO_STARTED: 'publicite_video_started',
    PUBLICITE_VIDEO_COMPLETED: 'publicite_video_completed',
  },
  useTrackEvent: () => ({ trackEvent }),
}))

// Test fixture volontairement distincte des vrais AD_PACKAGES (montants "ronds" faciles à
// distinguer dans les assertions).
const TEST_PLANS = buildPublicAdPlans([
  { id: 'test-pack', name: 'Test', credits: 10, price: 3000, isActive: true },
])

// `Number.prototype.toLocaleString('fr-FR')` (utilisé par formatXaf) sépare les milliers par une
// espace fine insécable (U+202F), pas une espace normale — Testing Library normalise le texte du
// DOM (tout \s -> espace normale) mais PAS la chaîne de recherche passée telle quelle à
// getByText, donc une comparaison exacte sur un `priceLabel` littéral échoue systématiquement.
// Matcher robuste aux deux formes plutôt que de fixer l'implémentation de formatXaf pour un
// détail de rendu de test.
function priceMatcher(priceLabel: string): RegExp {
  const escaped = priceLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(escaped.replace(/[\s  ]+/gi, '[\\s\\u202f\\u00a0]+'))
}

describe('PubliciteLandingClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('affiche le hero avec le H1, le prix d\'entrée et un unique bouton principal vers /advertising/create', () => {
    render(<PubliciteLandingClient plans={TEST_PLANS} entryPriceLabel="3 000 FCFA" />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Faites connaître votre activité au public gabonais' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/À partir de 3\s*000\s*FCFA pour 7 jours/)).toBeInTheDocument()

    const heroCtas = screen.getAllByRole('link', { name: 'Créer ma publicité' })
    expect(heroCtas.length).toBeGreaterThan(0)
    heroCtas.forEach((link) => expect(link).toHaveAttribute('href', '/advertising/create'))
  })

  it('rend une carte par forfait, avec son prix et ses emplacements', () => {
    render(<PubliciteLandingClient plans={TEST_PLANS} entryPriceLabel="3 000 FCFA" />)

    for (const plan of TEST_PLANS) {
      expect(screen.getByText(plan.name)).toBeInTheDocument()
      expect(screen.getByText(priceMatcher(plan.priceLabel))).toBeInTheDocument()
    }
  })

  it('déclenche le tracking avec la position au clic sur un CTA', () => {
    render(<PubliciteLandingClient plans={TEST_PLANS} entryPriceLabel="3 000 FCFA" />)

    fireEvent.click(screen.getAllByRole('link', { name: 'Créer ma publicité' })[0])

    expect(trackEvent).toHaveBeenCalledWith('publicite_cta_clicked', expect.objectContaining({ position: 'hero' }))
  })

  it('ouvre et ferme une question de la FAQ au clic', () => {
    render(<PubliciteLandingClient plans={TEST_PLANS} entryPriceLabel="3 000 FCFA" />)

    const question = screen.getByRole('button', { name: /À qui s'adresse Trouve Ton Nkama Publicité/ })
    expect(screen.queryByText(/entreprise, commerce, indépendant/)).not.toBeInTheDocument()

    fireEvent.click(question)
    expect(screen.getByText(/entreprise, commerce, indépendant/)).toBeInTheDocument()

    fireEvent.click(question)
    expect(screen.queryByText(/entreprise, commerce, indépendant/)).not.toBeInTheDocument()
  })

  it('ne duplique pas "Se connecter" (déjà fourni par la navbar globale du layout public)', () => {
    // Régression : une première version avait son propre en-tête sticky avec logo + "Se
    // connecter" + CTA, qui s'empilait avec la navbar globale déjà sticky (Navbar.tsx). Ce
    // composant ne doit plus rendre sa propre branche "Se connecter" — seuls les liens d'ancre
    // vers les sections de CETTE page.
    render(<PubliciteLandingClient plans={TEST_PLANS} entryPriceLabel="3 000 FCFA" />)

    expect(screen.queryByText('Se connecter')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Comment ça marche' })).toHaveAttribute('href', '#video')
    expect(screen.getByRole('link', { name: 'Emplacements' })).toHaveAttribute('href', '#emplacements')
    expect(screen.getByRole('link', { name: 'Tarifs' })).toHaveAttribute('href', '#tarifs')
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq')
  })

  it('n\'affiche qu\'un seul titre H1 sur toute la page (hiérarchie SEO)', () => {
    render(<PubliciteLandingClient plans={TEST_PLANS} entryPriceLabel="3 000 FCFA" />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('buildPublicAdPlans', () => {
  it('convertit les crédits au meilleur taux FCFA disponible dans les packs actifs', () => {
    const plans = buildPublicAdPlans([
      { id: 'a', name: 'A', credits: 5, price: 2000, isActive: true }, // 400/credit
      { id: 'b', name: 'B', credits: 50, price: 12500, isActive: true }, // 250/credit (meilleur)
    ])

    // AD_PACKAGES[0] = Découverte, 15 crédits -> 15 * 250 = 3750
    expect(plans[0].priceXaf).toBe(3750)
    expect(plans[0].priceLabel).toMatch(priceMatcher('3 750 FCFA'))
  })

  it('ignore les packs inactifs pour le calcul du meilleur taux', () => {
    const plans = buildPublicAdPlans([
      { id: 'cheap-but-inactive', name: 'X', credits: 100, price: 1000, isActive: false }, // 10/credit, ignoré
      { id: 'real', name: 'Y', credits: 10, price: 4000, isActive: true }, // 400/credit
    ])

    expect(plans[0].priceXaf).toBe(15 * 400)
  })

  it('repose sur le gabarit par défaut quand aucun pack actif n\'est fourni', () => {
    const plans = buildPublicAdPlans([])
    // Gabarit par défaut : meilleur taux 250 FCFA/crédit (pack "premium", 12500/50)
    expect(plans[0].priceXaf).toBe(15 * 250)
  })
})

import React from 'react'
import { render, screen } from '@testing-library/react'

import AdvertisingDashboardClient from '@/components/advertising/AdvertisingDashboardClient'

const useQueryMock = jest.fn()

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: { uid: 'announcer-lot6c', credits: 169 } }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

// embla-carousel touche window.matchMedia, absent de jsdom — comme les autres carousels de ce
// dépôt, jamais exercés en Jest (voir CarouselProperty.tsx), pas de polyfill global à réutiliser.
// Le carrousel mobile de stats n'est pas ce que ce test vérifie (les valeurs affichées le sont) :
// rendu direct des enfants, sans mécanique de défilement.
jest.mock('@trouve-ton-nkama/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('AdvertisingDashboardClient', () => {
  beforeEach(() => {
    useQueryMock.mockReturnValue({
      data: [{
        id: 'campaign-lot6c',
        title: 'Campagne statistiques',
        status: 'active',
        placements: ['reels_infeed'],
        imageURL: 'https://example.com/ad.jpg',
        startDate: '2026-07-19T00:00:00.000Z',
        endDate: '2026-07-26T00:00:00.000Z',
        metrics: { impressions: 80, clicks: 10 },
        creditsUsed: 70,
      }],
      isLoading: false,
      isError: false,
    })
  })

  it('affiche les compteurs et le taux de clic global et par campagne', () => {
    render(<AdvertisingDashboardClient />)

    expect(screen.getByRole('heading', { name: 'Publicités' })).toBeVisible()
    expect(screen.getByText('80 vues')).toBeVisible()
    expect(screen.getByText('10 clics')).toBeVisible()
    // 3 occurrences : la carte de campagne, la tuile "Taux de clic" du carrousel mobile, et sa
    // version grid desktop (les deux coexistent dans le DOM, seul le CSS bascule entre elles).
    expect(screen.getAllByText(/12,5 %/)).toHaveLength(3)
    expect(screen.getByText('169 crédits')).toBeVisible()
  })

  it('affiche le carrousel mobile de stats avec une pagination pour ses 4 tuiles', () => {
    // Demande explicite de l'utilisateur : les stats en carrousel sur mobile plutôt qu'un
    // simple empilement/grid — verrouille que les 4 tuiles y sont bien représentées (une
    // pastille de pagination par tuile), pas juste que leurs valeurs apparaissent quelque part
    // dans le DOM (déjà couvert par le test précédent).
    render(<AdvertisingDashboardClient />)

    const pagination = screen.getByRole('tablist', { name: 'Statistiques' })
    expect(pagination.querySelectorAll('[role="tab"]')).toHaveLength(4)
  })
})

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
    expect(screen.getAllByText(/12,5 %/)).toHaveLength(2)
    expect(screen.getByText('169 crédits')).toBeVisible()
  })
})

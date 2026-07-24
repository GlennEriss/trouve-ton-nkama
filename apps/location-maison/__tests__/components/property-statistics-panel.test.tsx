import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'

import PropertyStatisticsPanel from '@/components/property/PropertyStatisticsPanel'
import type { PropertyStatistics } from '@/db/property-statistics.db'
import type { Property } from '@/models/annonce'

function statistics(overrides: Partial<PropertyStatistics> = {}): PropertyStatistics {
  return {
    propertyId: 'property-stats-9b',
    propertyOwnerId: 'owner-9b',
    totalViews: 1250,
    uniqueViews: 840,
    totalContacts: 96,
    firstViewedAt: null,
    lastViewedAt: null,
    lastContactAt: null,
    viewsByDay: {
      '2026-07-17': 20,
      '2026-07-18': 48,
      '2026-07-19': 0,
      '2026-07-20': 72,
    },
    viewsByHour: {},
    viewsByMonth: {},
    viewsByProvince: { Estuaire: 700, 'Ogooué-Maritime': 300, WoleuNtem: 150, Ngounié: 70, Nyanga: 30, OgoouéIvindo: 10 },
    viewsByCity: {},
    uniqueViewers: [],
    averageViewDuration: 78,
    totalViewDuration: 9000,
    scrollDepth: {},
    imageViews: {},
    whatsappContacts: 61,
    phoneContacts: 35,
    whatsappShares: 28,
    facebookShares: 14,
    favoriteAdds: 45,
    interactionsByDay: {},
    viewsPerDay: 41.7,
    contactRate: 7.68,
    uniqueViewRate: 67.2,
    createdAt: null as never,
    updatedAt: null as never,
    ...overrides,
  }
}

function property(createdAt: unknown = { toMillis: () => Date.now() - 10 * 86400000 }): Property {
  return {
    id: 'property-stats-9b',
    title: 'Villa avec piscine',
    description: '',
    typeProperty: 'Villa',
    images: [],
    street: 'Okala',
    city: 'Libreville',
    province: 'Estuaire',
    longitude: 0,
    latitude: 0,
    country: 'Gabon',
    countryCode: 'GA',
    area: 300,
    price: 100000000,
    tags: [],
    status: 'FOR_SALE',
    state: 'IN_PROGRESS',
    moderationStatus: 'APPROVED',
    createdAt,
  } as Property
}

describe('PropertyStatisticsPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    let now = 1_800_000_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => {
      now += 250
      return now
    })
    Object.defineProperty(global, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('affiche et anime toutes les métriques annonceur', () => {
    render(<PropertyStatisticsPanel statistics={statistics()} property={property()} />)
    act(() => jest.runAllTimers())

    expect(screen.getByText('Vues totales')).toBeVisible()
    expect(screen.getByText('Visiteurs uniques')).toBeVisible()
    expect(screen.getByText('96')).toBeVisible()
    expect(screen.getByText('Évolution des vues')).toBeVisible()
    expect(screen.getByText('72 vues')).toBeVisible()
    expect(screen.getByText('Performance')).toBeVisible()
    expect(screen.getByText('78s')).toBeVisible()
    expect(screen.getByText('Origine géographique')).toBeVisible()
    expect(screen.getByText('Estuaire')).toBeVisible()
    expect(screen.queryByText('OgoouéIvindo')).not.toBeInTheDocument()
    expect(screen.getByText('Interactions détaillées')).toBeVisible()
    expect(screen.getByText('WhatsApp')).toBeVisible()
    expect(screen.getByText('Téléphone')).toBeVisible()
    expect(screen.getByText('Facebook')).toBeVisible()
    expect(screen.getByText('Favoris')).toBeVisible()
  })

  it('permet de sélectionner chaque période', () => {
    render(<PropertyStatisticsPanel statistics={statistics()} property={property()} />)
    for (const label of ['7 jours', '30 jours', '90 jours', 'Tout']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(screen.getByRole('button', { name: label }).className).toContain('text-emerald-600')
    }
  })

  it('gère les statistiques vides et un timestamp Firestore en secondes', () => {
    render(
      <PropertyStatisticsPanel
        statistics={statistics({
          totalViews: 0,
          uniqueViews: 0,
          totalContacts: 0,
          viewsByDay: {},
          viewsByProvince: {},
          averageViewDuration: 0,
          viewsPerDay: 0,
          contactRate: 0,
          uniqueViewRate: 0,
          whatsappContacts: 0,
          phoneContacts: 0,
          whatsappShares: 0,
          facebookShares: 0,
          favoriteAdds: 0,
        })}
        property={property({ seconds: Math.floor((Date.now() - 2 * 86400000) / 1000), nanoseconds: 0 })}
      />,
    )
    act(() => jest.runAllTimers())

    expect(screen.getByText('Aucune donnée disponible')).toBeVisible()
    expect(screen.getByText('Données géographiques bientôt disponibles')).toBeVisible()
    expect(screen.getByText("Les statistiques s'afficheront après les premières visites")).toBeVisible()
  })

  it('utilise un jour minimum quand la date de création est absente', () => {
    const withoutDate = property(undefined)
    delete (withoutDate as any).createdAt
    render(<PropertyStatisticsPanel statistics={statistics({ averageViewDuration: 12 })} property={withoutDate} />)
    expect(screen.getByText('1 jours')).toBeVisible()
  })
})

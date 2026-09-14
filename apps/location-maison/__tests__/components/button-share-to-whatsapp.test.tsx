import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import ButtonShareToWhatsapp from '@/components/preview-property/ButtonShareToWhatsapp'

const trackInteraction = jest.fn()
const openMock = jest.fn()

jest.mock('@/hooks/use-track-property-interaction', () => ({
  useTrackPropertyInteraction: () => ({ trackInteraction }),
}))

function longDescription() {
  return "Idéalement situé au PK13, ce charmant studio offre un cadre de vie pratique et confortable. Le logement se compose d'une chambre indépendante, d'un salon accueillant, d'une cuisine ouverte moderne et fonctionnelle, ainsi que d'une salle de douche avec toilettes intégrées. Parfait pour un jeune couple ou un travailleur, ce bien est proposé directement par le propriétaire. Les modalités d'entrée sont d'un mois de loyer et un mois de caution."
}

describe('ButtonShareToWhatsapp', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://www.tonnkama.com' }
    Object.defineProperty(window, 'open', { configurable: true, value: openMock })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('inclut la description complète, sans troncature ni "..." ajouté', () => {
    const property = {
      id: 'tBaS1K4t0XnrbL1xEnK7',
      title: 'Chaleureux studio avec chambre séparée à louer au PK13',
      description: longDescription(),
    } as any

    render(<ButtonShareToWhatsapp property={property} />)
    fireEvent.click(screen.getByRole('button'))

    expect(trackInteraction).toHaveBeenCalledWith('whatsapp_share')
    const [url] = openMock.mock.calls[0]
    const text = decodeURIComponent(new URL(url).searchParams.get('text') ?? '')

    expect(text).toContain(longDescription())
    expect(text).not.toContain('...')
    expect(text).toBe(
      `🏠 Découvrez cette annonce sur Trouve Ton Nkama :\n${property.title}\n${property.description}\nCliquez ici pour voir l'annonce : https://www.tonnkama.com/annonce/${property.id}\n\nCliquez ici pour rejoindre la chaîne WhatsApp : https://whatsapp.com/channel/0029Vb8Pdzv3wtb4UbkmPX0z`,
    )
  })
})

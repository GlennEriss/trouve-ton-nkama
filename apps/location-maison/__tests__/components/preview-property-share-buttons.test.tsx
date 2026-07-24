import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import ButtonShare from '@/components/preview-property/ButtonShare'
import ButtonShareToFacebook from '@/components/preview-property/ButtonShareToFacebook'
import ButtonShareToWhatsapp from '@/components/preview-property/ButtonShareToWhatsapp'

const trackInteraction = jest.fn()

jest.mock('@/hooks/use-track-property-interaction', () => ({
  useTrackPropertyInteraction: () => ({ trackInteraction }),
}))

const property = {
  id: 'prop-1',
  title: 'Belle villa a Nkembo',
  description: 'Une description assez longue pour tester le tronquage du message WhatsApp partage.',
} as any

describe('ButtonShareToFacebook', () => {
  const originalEnv = process.env
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
    window.open = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('trace le partage et ouvre le lien de partage Facebook', () => {
    render(<ButtonShareToFacebook property={property} />)
    fireEvent.click(screen.getByRole('button'))
    expect(trackInteraction).toHaveBeenCalledWith('facebook_share')
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('facebook.com/sharer/sharer.php'),
      '_blank',
      expect.any(String),
    )
  })
})

describe('ButtonShareToWhatsapp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.open = jest.fn()
  })

  it('trace le partage et ouvre WhatsApp avec un message tronque', () => {
    render(<ButtonShareToWhatsapp property={property} />)
    fireEvent.click(screen.getByRole('button'))
    expect(trackInteraction).toHaveBeenCalledWith('whatsapp_share')
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('api.whatsapp.com/send?text='), '_blank')
  })
})

describe('ButtonShare', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.open = jest.fn()
  })

  it('ouvre et ferme le menu de partage au clic', () => {
    render(<ButtonShare property={property} />)
    expect(screen.queryByText('Partager')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(1)

    fireEvent.click(screen.getByText('Partager'))
    expect(screen.getAllByRole('button')).toHaveLength(3)

    fireEvent.click(screen.getByText('Partager'))
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})

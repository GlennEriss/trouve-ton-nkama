import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import ButtonShare from '@/components/preview-property/ButtonShare'
import ButtonShareToFacebook from '@/components/preview-property/ButtonShareToFacebook'
import ButtonShareToWhatsapp from '@/components/preview-property/ButtonShareToWhatsapp'
import ButtonShareToThreads from '@/components/preview-property/ButtonShareToThreads'
import ButtonShareToInstagram from '@/components/preview-property/ButtonShareToInstagram'
import ButtonShareToTiktok from '@/components/preview-property/ButtonShareToTiktok'

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

describe('ButtonShareToThreads', () => {
  const originalEnv = process.env
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
    window.open = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('trace le partage et ouvre le composeur Threads pre-rempli', () => {
    render(<ButtonShareToThreads property={property} />)
    fireEvent.click(screen.getByRole('button'))
    expect(trackInteraction).toHaveBeenCalledWith('threads_share')
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('threads.net/intent/post?text='),
      '_blank',
      expect.any(String),
    )
  })
})

describe('ButtonShareToInstagram / ButtonShareToTiktok (pas d intent web, Web Share API ou copie)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // @ts-expect-error -- nettoie le mock pose par chaque test, sans casser jsdom pour les autres fichiers
    delete navigator.share
    // @ts-expect-error
    delete navigator.clipboard
  })

  it('Instagram : si navigator.share existe (mobile), ouvre la feuille de partage native sans copier', async () => {
    const share = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })

    render(<ButtonShareToInstagram property={property} />)
    fireEvent.click(screen.getByRole('button'))

    expect(trackInteraction).toHaveBeenCalledWith('instagram_share')
    await waitFor(() => expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: property.title }),
    ))
    expect(screen.queryByText(/Lien copié/)).not.toBeInTheDocument()
  })

  it('TikTok : sans navigator.share (desktop), copie le lien et affiche un retour visuel temporaire', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<ButtonShareToTiktok property={property} />)
    fireEvent.click(screen.getByRole('button'))

    expect(trackInteraction).toHaveBeenCalledWith('tiktok_share')
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('title', expect.stringContaining('Lien copié')))
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
    // 1 bouton declencheur + Facebook/WhatsApp/Threads/Instagram/TikTok.
    expect(screen.getAllByRole('button')).toHaveLength(6)

    fireEvent.click(screen.getByText('Partager'))
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import ContactSection from '@/components/preview-property/ContactSection'

let userData: any
let windowWidth: number
const trackInteraction = jest.fn()

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('@/hooks/use-user-by-uid', () => ({ useUserByUID: () => ({ data: userData }) }))
jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: windowWidth, height: 800 }) }))
jest.mock('@/hooks/use-track-property-interaction', () => ({
  useTrackPropertyInteraction: () => ({ trackInteraction }),
}))
jest.mock('@/components/reels/gift/GiftModal', () => ({
  __esModule: true,
  default: ({ isOpen, propertyId, announcerName }: any) =>
    isOpen ? <div data-testid="gift-modal">{propertyId} - {announcerName}</div> : null,
}))

const property = {
  id: 'prop-1',
  title: 'Villa a Nkembo',
  price: 250000,
  contact: null,
  createdBy: 'owner-1',
} as any

describe('ContactSection', () => {
  const originalEnv = process.env
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
    userData = { phoneNumbers: ['+24166545430'], firstname: 'Jean', lastname: 'Dupont' }
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('affiche directement le numero de telephone en desktop', () => {
    windowWidth = 1280
    render(<ContactSection property={property} />)
    expect(screen.getAllByText('+24166545430').length).toBeGreaterThan(0)
  })

  it('masque le numero sur mobile jusqu au clic, puis trace l interaction', () => {
    windowWidth = 375
    render(<ContactSection property={property} />)
    expect(screen.queryByText('+24166545430')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Afficher le numéro de téléphone'))
    expect(trackInteraction).toHaveBeenCalledWith('phone_contact', { phoneNumber: '+24166545430' })
    expect(screen.getByText('+24166545430')).toBeInTheDocument()
  })

  it('trace le clic WhatsApp et construit un lien wa.me avec le message', () => {
    windowWidth = 1280
    render(<ContactSection property={property} />)
    const link = screen.getByTitle('Contacter via WhatsApp')
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/+24166545430?text='))
    fireEvent.click(link)
    expect(trackInteraction).toHaveBeenCalledWith('whatsapp_contact', { phoneNumber: '+24166545430' })
  })

  it('ouvre la modale de cadeau avec le nom de l annonceur', () => {
    windowWidth = 1280
    render(<ContactSection property={property} />)
    fireEvent.click(screen.getByTitle("Envoyer un cadeau à l'annonceur"))
    expect(screen.getByTestId('gift-modal')).toHaveTextContent('prop-1 - Jean Dupont')
  })

  it('utilise le lien # quand aucun numero n est disponible', () => {
    windowWidth = 1280
    userData = undefined
    render(<ContactSection property={{ ...property, contact: null }} />)
    expect(screen.getByTitle('Contacter via WhatsApp')).toHaveAttribute('href', '#')
  })
})

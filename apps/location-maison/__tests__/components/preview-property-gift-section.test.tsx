import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import GiftSection from '@/components/preview-property/GiftSection'

let userData: any

jest.mock('@/hooks/use-user-by-uid', () => ({ useUserByUID: () => ({ data: userData }) }))
jest.mock('@/components/reels/gift/GiftModal', () => ({
  __esModule: true,
  default: ({ isOpen, propertyId, announcerName }: any) =>
    isOpen ? <div data-testid="gift-modal">{propertyId} - {announcerName}</div> : null,
}))

const property = {
  id: 'prop-1',
  title: 'Villa a Nkembo',
  price: 250000,
  createdBy: 'owner-1',
} as any

describe('GiftSection', () => {
  beforeEach(() => {
    userData = { firstname: 'Jean', lastname: 'Dupont' }
  })

  it("est une section distincte du choix d'un moyen de contact", () => {
    render(<GiftSection property={property} />)
    expect(screen.getByText('Envoyer un cadeau')).toBeInTheDocument()
    expect(screen.queryByText('Choisissez un moyen de contact')).not.toBeInTheDocument()
  })

  it('ouvre la modale de cadeau avec le nom de l annonceur', () => {
    render(<GiftSection property={property} />)
    fireEvent.click(screen.getByRole('button', { name: 'Offrir un cadeau' }))
    expect(screen.getByTestId('gift-modal')).toHaveTextContent('prop-1 - Jean Dupont')
  })

  it("retombe sur 'l'annonceur' quand le nom n'est pas connu", () => {
    userData = undefined
    render(<GiftSection property={property} />)
    expect(screen.getByText(/soutenir l'annonceur/)).toBeInTheDocument()
  })
})

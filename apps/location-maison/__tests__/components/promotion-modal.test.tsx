import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { PromotionModal } from '@/components/promotion/PromotionModal'

const promoteMock = jest.fn()
const canPromoteMock = jest.fn()
const openRechargeMock = jest.fn()
const closeMock = jest.fn()

let hookState: Record<string, any>

jest.mock('@/hooks/use-promotion', () => ({ usePromotion: () => hookState }))
jest.mock('@/providers/RechargeProvider', () => ({ useRecharge: () => ({ openRecharge: openRechargeMock }) }))
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <section>{children}</section>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))
jest.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }))
jest.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }))

const property = (type: any = null) => ({
  id: 'property-9c',
  title: 'Belle maison à Akanda',
  currentPromotion: type ? { type } : undefined,
} as any)

describe('PromotionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    canPromoteMock.mockReturnValue(true)
    hookState = {
      promoteProperty: promoteMock,
      isLoading: false,
      hasActivePromotion: false,
      canPromote: canPromoteMock,
      getPromotionStatus: jest.fn(() => null),
      userCredits: 20,
    }
  })

  it('ne rend rien lorsque la modale est fermée', () => {
    render(<PromotionModal property={property()} isOpen={false} onClose={closeMock} />)
    expect(screen.queryByText('Promouvoir votre annonce')).not.toBeInTheDocument()
  })

  it('sélectionne une offre puis lance une promotion', () => {
    render(<PromotionModal property={property()} isOpen onClose={closeMock} />)
    expect(screen.getByText('Belle maison à Akanda', { exact: false })).toBeVisible()
    const submit = screen.getByRole('button', { name: /Promouvoir maintenant/i })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Sélectionner Mise en tendance courte - 5 crédits' }))
    expect(screen.getByText('Récapitulatif de votre sélection')).toBeVisible()
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    expect(promoteMock).toHaveBeenCalledWith('trending-3d')
    expect(screen.queryByText('Récapitulatif de votre sélection')).not.toBeInTheDocument()
  })

  it('affiche une promotion active et son échéance', () => {
    hookState.hasActivePromotion = true
    hookState.getPromotionStatus = jest.fn(() => ({ daysLeft: 2, isExpiringSoon: true }))
    render(<PromotionModal property={property('featured')} isOpen onClose={closeMock} />)
    expect(screen.getByText(/actuellement à la une/)).toBeVisible()
    expect(screen.getByText(/2 jours restants/)).toBeVisible()
    expect(screen.getByText('Expire bientôt')).toBeVisible()
    expect(screen.getByText('Active')).toBeVisible()
  })

  it.each([
    ['trending-7d', 'en tendance (7j)'],
    ['trending-3d', 'en tendance (3j)'],
    ['boost', 'boostée'],
  ])('nomme la promotion %s', (type, label) => {
    hookState.hasActivePromotion = true
    hookState.getPromotionStatus = jest.fn(() => ({ daysLeft: 0, isExpiringSoon: false }))
    render(<PromotionModal property={property(type)} isOpen onClose={closeMock} />)
    expect(screen.getByText(new RegExp(`actuellement ${label.replace(/[()]/g, '\\$&')}`))).toBeVisible()
  })

  it('désactive les offres non disponibles ou trop chères et ouvre la recharge', () => {
    hookState.userCredits = 4
    canPromoteMock.mockImplementation((type) => type !== 'boost')
    render(<PromotionModal property={property()} isOpen onClose={closeMock} />)
    expect(screen.getByRole('button', { name: 'Sélectionner Mise à la une - 15 crédits' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sélectionner Remonter une annonce - 3 crédits' })).toBeDisabled()
    expect(screen.getAllByText('Crédits insuffisants')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: /Recharger/i }))
    expect(openRechargeMock).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(closeMock).toHaveBeenCalled()
  })

  it('montre le traitement en cours', () => {
    hookState.isLoading = true
    render(<PromotionModal property={property()} isOpen onClose={closeMock} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sélectionner Remonter une annonce - 3 crédits' }))
    expect(screen.getByRole('button', { name: /Promotion en cours/i })).toBeDisabled()
  })
})

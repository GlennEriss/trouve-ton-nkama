import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import PurchaseModal from '@/components/my-balance/PurchaseModal'

const purchaseMock = jest.fn()
const toastMock = jest.fn()
const invalidateMock = jest.fn()
const closeMock = jest.fn()

let purchaseState: Record<string, any>
let transactionState: Record<string, any>
let packsState: Record<string, any>

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateMock }),
}))
jest.mock('@/hooks/use-credits-purchase', () => ({ useCreditsPurchase: () => purchaseState }))
jest.mock('@/hooks/use-transaction-status', () => ({ useTransactionStatus: () => transactionState }))
jest.mock('@/hooks/use-credit-packs', () => ({ useCreditPacks: () => packsState }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), error: jest.fn() }) }))
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, ...props }: any) => <img {...props} />,
}))
jest.mock('@/components/my-balance/PaymentStatusModal', () => ({
  __esModule: true,
  default: ({ isOpen, status, message, actionLabel, onAction, onClose, phoneNumber }: any) => isOpen ? (
    <div data-testid="payment-status">
      <span>{status}</span><span>{message}</span><span>{phoneNumber}</span>
      <button onClick={onAction}>{actionLabel}</button>
      <button onClick={onClose}>Fermer statut</button>
    </div>
  ) : null,
}))

const starter = { id: 'starter', name: 'Starter', credits: 5, price: 2000, isActive: true }
const standard = { id: 'standard', name: 'Standard', credits: 10, price: 3500, savings: 12.5, isActive: true }

describe('PurchaseModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    purchaseState = { mutate: purchaseMock, isPending: false, isError: false, error: null }
    transactionState = { status: 'idle', failureReason: null }
    packsState = { data: { packs: [starter, standard] }, isFetching: false }
  })

  it('ne rend rien quand la modale est fermée', () => {
    render(<PurchaseModal isOpen={false} onClose={closeMock} />)
    expect(screen.queryByText('Recharger mes crédits')).not.toBeInTheDocument()
  })

  it('affiche les packs actifs et leur économie', () => {
    render(<PurchaseModal isOpen onClose={closeMock} />)
    expect(screen.getByText('Choisissez votre pack de crédits')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Sélectionner le pack Starter - 5 crédits pour 2000 FCFA' })).toBeVisible()
    expect(screen.getByText('Économisez 12.5%')).toBeVisible()
  })

  it('affiche un état vide lorsqu aucun pack admin n est disponible', () => {
    packsState = { data: { packs: [] }, isFetching: false }
    render(<PurchaseModal isOpen onClose={closeMock} />)
    expect(screen.getByText(/Aucun pack actif/)).toBeVisible()
  })

  it('sélectionne un pack au clavier et revient à la liste', () => {
    render(<PurchaseModal isOpen onClose={closeMock} />)
    const pack = screen.getByRole('button', { name: /Sélectionner le pack Starter/i })
    fireEvent.keyDown(pack, { key: 'Tab' })
    expect(screen.queryByText('Paiement mobile money')).not.toBeInTheDocument()
    fireEvent.keyDown(pack, { key: ' ' })
    expect(screen.getByText('Paiement mobile money')).toBeVisible()
    expect(screen.getByText('Pack Starter - 2,000 FCFA')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }))
    expect(screen.getByText('Choisissez votre pack de crédits')).toBeVisible()
  })

  it('détecte le réseau, valide le téléphone et initie le paiement', async () => {
    render(<PurchaseModal isOpen onClose={closeMock} />)
    fireEvent.click(screen.getByRole('button', { name: /Sélectionner le pack Standard/i }))
    const phone = screen.getByLabelText('Numéro de téléphone')
    const network = screen.getByLabelText('Réseau')

    fireEvent.change(phone, { target: { value: '062123456' } })
    expect(network).toHaveValue('MM')
    expect(screen.getByRole('button', { name: 'Payer' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }))
    expect(purchaseMock).toHaveBeenCalledWith({ packId: 'standard', phoneNumber: '062123456', network: 'MM' }, expect.any(Object))

    const callbacks = purchaseMock.mock.calls[0][1]
    await act(async () => callbacks.onSuccess({ transactionId: 'mypay-9c' }))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Paiement initié' }))
    expect(screen.getByTestId('payment-status')).toHaveTextContent('pending')
    expect(screen.getByTestId('payment-status')).toHaveTextContent('062123456')
  })

  it('bloque un numéro invalide et permet de sélectionner manuellement le réseau', () => {
    render(<PurchaseModal isOpen onClose={closeMock} preselectedPack={starter as any} />)
    fireEvent.change(screen.getByLabelText('Réseau'), { target: { value: 'MM' } })
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '123' } })
    expect(screen.getByText(/Numéro invalide/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Payer' })).toBeDisabled()
    expect(purchaseMock).not.toHaveBeenCalled()
  })

  it('affiche les erreurs du hook et du callback de paiement', () => {
    purchaseState = { mutate: purchaseMock, isPending: false, isError: true, error: new Error('MyPayGa indisponible') }
    render(<PurchaseModal isOpen onClose={closeMock} preselectedPack={starter as any} />)
    expect(screen.getByText('MyPayGa indisponible')).toBeVisible()
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '077123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }))
    const callbacks = purchaseMock.mock.calls[0][1]
    callbacks.onError(new Error('Paiement refusé'))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erreur de paiement', variant: 'destructive' }))
  })

  it('rafraîchit les soldes après succès puis ferme et réinitialise', async () => {
    const { rerender } = render(<PurchaseModal isOpen onClose={closeMock} preselectedPack={starter as any} />)
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '+241 077 123 456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }))
    await act(async () => purchaseMock.mock.calls[0][1].onSuccess({ transactionId: 'tx-success' }))

    transactionState = { status: 'success', failureReason: null }
    rerender(<PurchaseModal isOpen onClose={closeMock} preselectedPack={starter as any} />)
    await waitFor(() => expect(invalidateMock).toHaveBeenCalledTimes(3))
    expect(screen.getByTestId('payment-status')).toHaveTextContent('success')
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(closeMock).toHaveBeenCalled()
  })

  it.each(['failed', 'cancelled'])('permet de réessayer un paiement %s', async (status) => {
    const { rerender } = render(<PurchaseModal isOpen onClose={closeMock} preselectedPack={starter as any} />)
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '077123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Payer' }))
    await act(async () => purchaseMock.mock.calls[0][1].onSuccess({ transactionId: `tx-${status}` }))
    transactionState = { status, failureReason: 'Solde insuffisant' }
    rerender(<PurchaseModal isOpen onClose={closeMock} preselectedPack={starter as any} />)
    expect(screen.getByTestId('payment-status')).toHaveTextContent('failed')
    expect(screen.getByText('Solde insuffisant')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(screen.queryByTestId('payment-status')).not.toBeInTheDocument()
  })

  it('ferme depuis l entête ou l annulation d un pack présélectionné', () => {
    const { container } = render(<PurchaseModal isOpen onClose={closeMock} preselectedPack={starter as any} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(closeMock).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('button.p-2')!)
    expect(closeMock).toHaveBeenCalledTimes(2)
  })
})

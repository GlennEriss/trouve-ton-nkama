import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import GiftsDashboard from '@/components/gifts/GiftsDashboard'

const mockInvalidate = jest.fn()
const mockToast = jest.fn()
let mockQuery: any

jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))
jest.mock('@/hooks/use-gifts-summary', () => ({ useGiftsSummary: () => mockQuery }))

const data = {
  balance: { disponibleXaf: 10000, totalRecuXaf: 15000, totalRetireXaf: 5000, hasPendingWithdrawal: false },
  gifts: [
    { id: 'g1', netAmountXaf: 950, donorPhoneMasked: '077***342', createdAt: '2026-07-20', message: 'Bravo' },
    { id: 'g2', netAmountXaf: 1900, donorPhoneMasked: 'Anonyme', createdAt: null, message: '' },
  ],
  withdrawals: [
    { id: 'w1', netPayoutXaf: 9500, reseau: 'AM', numero: '074123456', dateCreation: '2026-07-21', statut: 'EN_ATTENTE' },
    { id: 'w2', netPayoutXaf: 5000, reseau: 'MM', numero: '066123456', dateCreation: null, statut: 'TRAITE' },
    { id: 'w3', netPayoutXaf: 3000, reseau: 'MM', numero: '065123456', dateCreation: '2026-06-01', statut: 'REFUSE', motifRefus: 'Numéro invalide' },
  ],
}

describe('GiftsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQuery = { isPending: false, isLoading: false, isError: false, data }
    global.fetch = jest.fn()
  })

  it('rend les états de chargement et d’erreur', () => {
    mockQuery = { isPending: true }
    const { container, rerender } = render(<GiftsDashboard />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    mockQuery = { isError: true, data: null }
    rerender(<GiftsDashboard />)
    expect(screen.getByText(/Impossible de charger/)).toBeVisible()
  })

  it('affiche soldes, cadeaux et tous les statuts de retrait', () => {
    render(<GiftsDashboard />)
    expect(screen.getByText('10 000 FCFA')).toBeVisible()
    expect(screen.getByText('15 000 FCFA')).toBeVisible()
    expect(screen.getByText('En attente')).toBeVisible()
    expect(screen.getByText('Versé')).toBeVisible()
    expect(screen.getByText('Refusé')).toBeVisible()
    expect(screen.getByText('Motif : Numéro invalide')).toBeVisible()
    expect(screen.getByText('« Bravo »')).toBeVisible()
  })

  it('explique un solde insuffisant et un retrait déjà en attente', () => {
    mockQuery = { ...mockQuery, data: { balance: { ...data.balance, disponibleXaf: 3000 }, gifts: [], withdrawals: [] } }
    const { rerender } = render(<GiftsDashboard />)
    expect(screen.getByText(/il te manque encore/)).toBeVisible()
    expect(screen.getByText(/Aucun cadeau pour le moment/)).toBeVisible()
    mockQuery = { ...mockQuery, data: { balance: { ...data.balance, hasPendingWithdrawal: true }, gifts: [], withdrawals: [] } }
    rerender(<GiftsDashboard />)
    expect(screen.getByText(/demande de retrait est en cours/)).toBeVisible()
  })

  it('valide le réseau et envoie une demande Airtel Money', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
    render(<GiftsDashboard />)
    fireEvent.click(screen.getByRole('button', { name: /Retirer.*10.*000 FCFA/ }))
    const input = screen.getByLabelText('Numéro Mobile Money')
    fireEvent.change(input, { target: { value: '066123456' } })
    expect(screen.getByRole('alert')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Confirmer le retrait' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '074123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/gifts/withdrawals', expect.objectContaining({ body: JSON.stringify({ numero: '074123456', reseau: 'AM' }) })))
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Demande envoyée' }))
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['gifts-summary'] })
  })

  it('permet Moov Money, annule et affiche les frais', () => {
    render(<GiftsDashboard />)
    fireEvent.click(screen.getByRole('button', { name: /Retirer/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Moov Money' }))
    expect(screen.getByRole('button', { name: 'Moov Money' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Frais de service/)).toHaveTextContent('500 FCFA')
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByLabelText('Numéro Mobile Money')).not.toBeInTheDocument()
  })

  it('affiche le message serveur et absorbe une panne réseau', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Retrait déjà en attente' }) })
    render(<GiftsDashboard />)
    fireEvent.click(screen.getByRole('button', { name: /Retirer/ }))
    fireEvent.change(screen.getByLabelText('Numéro Mobile Money'), { target: { value: '074123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }))
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Retrait impossible', description: 'Retrait déjà en attente' })))

    ;(fetch as jest.Mock).mockRejectedValueOnce('offline')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }))
    await waitFor(() => expect(mockToast).toHaveBeenLastCalledWith(expect.objectContaining({ description: 'Erreur inattendue.' })))
  })
})

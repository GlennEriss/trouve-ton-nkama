import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import CreditHistory from '@/components/my-balance/CreditHistory'

const refetchMock = jest.fn()
const fetchNextPageMock = jest.fn()
const useCreditHistoryMock = jest.fn()

let historyState: Record<string, any>

jest.mock('@/hooks/use-credit-history', () => ({
  useCreditHistory: (options: unknown) => useCreditHistoryMock(options),
}))

jest.mock('@trouve-ton-nkama/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

jest.mock('@trouve-ton-nkama/ui/select', () => ({
  Select: ({ value, onValueChange }: any) => (
    <select aria-label="Filtrer les transactions" value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="all">Toutes</option>
      <option value="purchase">Achats</option>
      <option value="spend">Dépenses</option>
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children }: any) => <>{children}</>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
}))

const transaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  type: 'purchase',
  description: 'Pack Essentiel',
  credits: 20,
  amount: 7000,
  status: 'success',
  createdAt: new Date('2026-07-20T10:30:00Z'),
  ...overrides,
})

describe('CreditHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    historyState = {
      data: undefined,
      isLoading: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: fetchNextPageMock,
      isFetchingNextPage: false,
      refetch: refetchMock,
    }
    useCreditHistoryMock.mockImplementation(() => historyState)
  })

  it('affiche le squelette pendant le chargement', () => {
    historyState.isLoading = true
    const { container } = render(<CreditHistory />)
    expect(screen.getByText('Chargement...')).toBeVisible()
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5)
  })

  it('affiche une erreur et permet de relancer la requête', () => {
    historyState.error = new Error('Firestore indisponible')
    render(<CreditHistory />)
    expect(screen.getByText('Erreur de chargement')).toBeVisible()
    expect(screen.getByText('Firestore indisponible')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(refetchMock).toHaveBeenCalled()
  })

  it.each([
    ['all', 'Vos achats et utilisations de crédits apparaîtront ici'],
    ['purchase', 'Aucun achat de crédits trouvé'],
    ['spend', 'Aucune dépense de crédits trouvée'],
  ])('adapte l état vide au filtre %s', async (filter, message) => {
    historyState.data = { pages: [{ transactions: [], total: 0 }] }
    render(<CreditHistory />)
    if (filter !== 'all') {
      fireEvent.change(screen.getByLabelText('Filtrer les transactions'), { target: { value: filter } })
    }
    expect(await screen.findByText(message)).toBeVisible()
    expect(useCreditHistoryMock).toHaveBeenLastCalledWith({ type: filter, limit: 10 })
    expect(screen.getByRole('button', { name: /Exporter/i })).toBeDisabled()
  })

  it('fusionne les pages et présente achats, dépenses et statuts', async () => {
    const { rerender } = render(<CreditHistory />)
    historyState.data = { pages: [
      { transactions: [transaction()], total: 4 },
      { transactions: [
        transaction({ id: 'tx-2', type: 'spend', description: 'Promotion', credits: -5, amount: null, status: 'pending', createdAt: { toDate: () => new Date('2026-07-21T09:00:00Z') } }),
        transaction({ id: 'tx-3', description: 'Paiement refusé', status: 'failed', credits: 0 }),
        transaction({ id: 'tx-4', description: 'Statut externe', status: 'cancelled', credits: -1 }),
      ], total: 4 },
    ] }
    rerender(<CreditHistory />)
    expect(await screen.findByText('4 transactions au total')).toBeVisible()
    expect(screen.getAllByText('Pack Essentiel')).toHaveLength(2)
    expect(screen.getAllByText('Achat')).toHaveLength(6)
    expect(screen.getAllByText('Dépense')).toHaveLength(2)
    expect(screen.getAllByText('Validé')).toHaveLength(2)
    expect(screen.getAllByText('En cours')).toHaveLength(2)
    expect(screen.getAllByText('Échoué')).toHaveLength(2)
    expect(screen.getAllByText('cancelled')).toHaveLength(2)
    expect(screen.getAllByText('7,000 FCFA')).toHaveLength(6)
  })

  it('exporte les transactions en CSV', async () => {
    const createObjectURL = jest.fn(() => 'blob:credits')
    const revokeObjectURL = jest.fn()
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { rerender } = render(<CreditHistory />)
    historyState.data = { pages: [{ transactions: [transaction()], total: 1 }] }
    rerender(<CreditHistory />)
    const exportButton = await screen.findByRole('button', { name: /Exporter/i })
    await waitFor(() => expect(exportButton).toBeEnabled())
    fireEvent.click(exportButton)
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:credits')
    clickSpy.mockRestore()
  })

  it('charge la page suivante une seule fois', async () => {
    historyState.data = { pages: [{ transactions: [transaction()], total: 2 }] }
    historyState.hasNextPage = true
    const { rerender } = render(<CreditHistory />)
    const loadMore = await screen.findByRole('button', { name: 'Voir plus de transactions' })
    fireEvent.click(loadMore)
    expect(fetchNextPageMock).toHaveBeenCalledTimes(1)

    historyState.isFetchingNextPage = true
    rerender(<CreditHistory />)
    const loading = screen.getByRole('button', { name: /Chargement/i })
    expect(loading).toBeDisabled()
    fireEvent.click(loading)
    expect(fetchNextPageMock).toHaveBeenCalledTimes(1)
  })
})

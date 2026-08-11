import { act, renderHook } from '@testing-library/react'
import { useSearchRequestPayment } from '@/hooks/use-search-request-payment'

const fetchMock = jest.fn()

const input = {
  typeProperty: 'Home',
  transactionType: 'FOR_RENT' as const,
  province: 'Estuaire',
  city: 'Libreville',
  neighborhood: 'Akanda',
  budgetMinXaf: 100_000,
  budgetMaxXaf: 250_000,
  description: 'Cherche un 3 pieces proche du centre.',
  whatsappContact: '074000000',
  payerPhone: '074000000',
  network: 'AM' as const,
  boostRequested: true,
}

function jsonResponse(body: Record<string, unknown>, ok = true) {
  return { ok, json: jest.fn().mockResolvedValue(body) }
}

describe('useSearchRequestPayment', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('demarre au repos', () => {
    const { result } = renderHook(() => useSearchRequestPayment())
    expect(result.current.phase).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('poste la demande complete sur la route d initiation', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-1' }))
    const { result } = renderHook(() => useSearchRequestPayment())

    act(() => {
      void result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/search-requests/initiate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(input),
    }))
    expect(result.current.phase).toBe('waiting_confirmation')
  })

  it('expose le refus d initiation fourni par l API', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: 'Numéro invalide' }, false))
    const { result } = renderHook(() => useSearchRequestPayment())

    await act(async () => {
      await result.current.submitSearchRequest(input)
    })

    expect(result.current.phase).toBe('failed')
    expect(result.current.error).toBe('Numéro invalide')
  })

  it('retombe sur un message generique quand l API refuse sans motif', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false }, false))
    const { result } = renderHook(() => useSearchRequestPayment())

    await act(async () => {
      await result.current.submitSearchRequest(input)
    })

    expect(result.current.error).toBe("Impossible d'initier le paiement.")
  })

  it('echoue quand l API repond 200 sans transactionId', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    const { result } = renderHook(() => useSearchRequestPayment())

    await act(async () => {
      await result.current.submitSearchRequest(input)
    })

    expect(result.current.phase).toBe('failed')
  })

  it('affiche une erreur claire en cas de panne reseau initiale', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useSearchRequestPayment())

    await act(async () => {
      await result.current.submitSearchRequest(input)
    })

    expect(result.current.phase).toBe('failed')
    expect(result.current.error).toContain('Erreur réseau')
  })

  it('passe en succes apres confirmation du paiement', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-1' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'confirmed' }))
    const { result } = renderHook(() => useSearchRequestPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.phase).toBe('waiting_confirmation')

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000)
      await pending!
    })

    expect(fetchMock).toHaveBeenLastCalledWith('/api/search-requests/tx-1/status')
    expect(result.current.phase).toBe('success')
    expect(result.current.error).toBeNull()
  })

  it('restitue le motif du fournisseur quand le paiement echoue', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-2' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'failed', failureReason: 'Solde insuffisant' }))
    const { result } = renderHook(() => useSearchRequestPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
      await jest.advanceTimersByTimeAsync(3000)
      await pending!
    })

    expect(result.current.phase).toBe('failed')
    expect(result.current.error).toBe('Solde insuffisant')
  })

  it('encode l identifiant de transaction dans l URL de polling', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx/1 2' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'confirmed' }))
    const { result } = renderHook(() => useSearchRequestPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
      await jest.advanceTimersByTimeAsync(3000)
      await pending!
    })

    expect(fetchMock).toHaveBeenLastCalledWith('/api/search-requests/tx%2F1%202/status')
  })

  // Le visiteur tape son code MoMo sur son telephone : une coupure passagere
  // pendant l attente ne doit pas annuler le paiement deja lance.
  it('poursuit le polling malgre une reponse de statut en erreur', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-3' }))
      .mockResolvedValueOnce({ ok: false, json: jest.fn() })
      .mockResolvedValueOnce(jsonResponse({ status: 'confirmed' }))
    const { result } = renderHook(() => useSearchRequestPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
      await jest.advanceTimersByTimeAsync(3000)
      await jest.advanceTimersByTimeAsync(3000)
      await pending!
    })

    expect(result.current.phase).toBe('success')
  })

  it('poursuit le polling malgre une panne reseau transitoire', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-4' }))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(jsonResponse({ status: 'confirmed' }))
    const { result } = renderHook(() => useSearchRequestPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
      await jest.advanceTimersByTimeAsync(3000)
      await jest.advanceTimersByTimeAsync(3000)
      await pending!
    })

    expect(result.current.phase).toBe('success')
  })

  it('abandonne apres trois minutes sans confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-5' }))
      .mockResolvedValue(jsonResponse({ status: 'pending_confirmation' }))
    const { result } = renderHook(() => useSearchRequestPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
      await jest.advanceTimersByTimeAsync(3 * 60_000 + 3000)
      await pending!
    })

    expect(result.current.phase).toBe('timeout')
    expect(result.current.error).toContain('toujours en attente')
  })

  it('annule le polling et remet le hook a zero', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-6' }))
    const { result } = renderHook(() => useSearchRequestPayment())

    act(() => {
      void result.current.submitSearchRequest(input)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.phase).toBe('waiting_confirmation')

    act(() => result.current.reset())
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000)
    })

    expect(result.current.phase).toBe('idle')
    expect(result.current.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

import { act, renderHook } from '@testing-library/react'
import { useGiftPayment } from '@/hooks/use-gift-payment'

const fetchMock = jest.fn()
const input = {
  reelId: 'reel-1',
  amount: 1000,
  phoneNumber: '077123456',
  network: 'AM' as const,
  message: 'Bravo',
}

function jsonResponse(body: Record<string, unknown>, ok = true) {
  return { ok, json: jest.fn().mockResolvedValue(body) }
}

describe('useGiftPayment', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('expose le refus d initiation fourni par l API', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: 'Numéro invalide' }, false))
    const { result } = renderHook(() => useGiftPayment())

    await act(async () => {
      await result.current.sendGift(input)
    })

    expect(result.current.phase).toBe('failed')
    expect(result.current.error).toBe('Numéro invalide')
    expect(fetchMock).toHaveBeenCalledWith('/api/gifts/initiate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(input),
    }))
  })

  it('affiche une erreur claire en cas de panne reseau initiale', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useGiftPayment())

    await act(async () => {
      await result.current.sendGift(input)
    })

    expect(result.current.phase).toBe('failed')
    expect(result.current.error).toContain('Erreur réseau')
  })

  it('passe en succes apres confirmation du webhook', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-1' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }))
    const { result } = renderHook(() => useGiftPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.sendGift(input)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.phase).toBe('waiting_confirmation')

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000)
      await pending!
    })

    expect(fetchMock).toHaveBeenLastCalledWith('/api/gifts/tx-1/status')
    expect(result.current.phase).toBe('success')
    expect(result.current.error).toBeNull()
  })

  it('restitue le motif du fournisseur quand le paiement echoue', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-2' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'failed', failureReason: 'Solde insuffisant' }))
    const { result } = renderHook(() => useGiftPayment())
    let pending: Promise<void>

    act(() => {
      pending = result.current.sendGift(input)
    })
    await act(async () => {
      await Promise.resolve()
      await jest.advanceTimersByTimeAsync(3000)
      await pending!
    })

    expect(result.current.phase).toBe('failed')
    expect(result.current.error).toBe('Solde insuffisant')
  })

  it('annule le polling et remet le hook a zero', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, transactionId: 'tx-3' }))
    const { result } = renderHook(() => useGiftPayment())

    act(() => {
      void result.current.sendGift(input)
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

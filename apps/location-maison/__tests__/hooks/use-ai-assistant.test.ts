import { act, renderHook } from '@testing-library/react'

import useAIAssistant from '@/hooks/useAIAssistant'

const mockUpdate = jest.fn()
const mockGetIdToken = jest.fn()
let mockSession: any

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: mockSession, update: mockUpdate }) }))
jest.mock('@/firebase/auth', () => ({ auth: { currentUser: { getIdToken: () => mockGetIdToken() } } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn() }) }))

describe('useAIAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = { user: { uid: 'u1', credits: 3, firstname: 'Glenn' } }
    mockGetIdToken.mockResolvedValue('firebase-token')
    mockUpdate.mockResolvedValue(undefined)
    global.fetch = jest.fn()
  })

  it('refuse les visiteurs, les crédits épuisés et les messages trop courts', async () => {
    mockSession = null
    const { result, rerender } = renderHook(() => useAIAssistant())
    await expect(result.current.sendMessage('maison')).resolves.toMatchObject({ success: false, error: expect.stringContaining('connecté') })
    mockSession = { user: { uid: 'u1', credits: 0 } }; rerender()
    await expect(result.current.sendMessage('maison')).resolves.toMatchObject({ error: expect.stringContaining('Crédits insuffisants') })
    mockSession = { user: { uid: 'u1', credits: 3 } }; rerender()
    await expect(result.current.sendMessage(' ')).resolves.toMatchObject({ error: expect.stringContaining('trop court') })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('envoie le token, met à jour les crédits et restitue la transaction', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, response: 'Voici votre annonce', creditsRemaining: 2, transactionId: 'tx-1' }) })
    const { result } = renderHook(() => useAIAssistant())
    let response: any
    await act(async () => { response = await result.current.sendMessage('  Belle chambre Akébé  ', { activeStep: 1 } as any) })
    expect(fetch).toHaveBeenCalledWith('/api/ai/assistant/chat', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer firebase-token' }), body: JSON.stringify({ message: 'Belle chambre Akébé', context: { activeStep: 1 } }) }))
    expect(mockUpdate).toHaveBeenCalledWith({ user: expect.objectContaining({ credits: 2 }) })
    expect(response).toEqual({ success: true, response: 'Voici votre annonce', creditsRemaining: 2, transactionId: 'tx-1' })
    expect(result.current.isLoading).toBe(false)
  })

  it('omet Authorization sans utilisateur Firebase et accepte un solde absent', async () => {
    mockGetIdToken.mockResolvedValueOnce(undefined)
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, response: 'ok', creditsRemaining: undefined, transactionId: null }) })
    const { result } = renderHook(() => useAIAssistant())
    await act(async () => { await result.current.sendMessage('question utile') })
    expect((fetch as jest.Mock).mock.calls[0][1].headers).not.toHaveProperty('Authorization')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('concatène les erreurs de validation du serveur', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Payload invalide', details: { issues: [{ path: 'message', message: 'trop long' }, { message: 'incorrect' }] } } }) })
    const { result } = renderHook(() => useAIAssistant())
    await act(async () => expect(result.current.sendMessage('question')).resolves.toEqual({ success: false, error: 'Payload invalide (message: trop long | incorrect)' }))
  })

  it('borne un message très long avant l’appel API', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, response: 'ok', creditsRemaining: 2, transactionId: null }) })
    const { result } = renderHook(() => useAIAssistant())
    await act(async () => { await result.current.sendMessage('x'.repeat(41000)) })
    expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body).message).toHaveLength(40000)
  })

  it('traduit les réponses mal formées et les pannes réseau', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    const { result } = renderHook(() => useAIAssistant())
    await act(async () => expect(result.current.sendMessage('question')).resolves.toMatchObject({ success: false, error: expect.stringContaining("appel") }))
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
    await act(async () => expect(result.current.sendMessage('question')).resolves.toMatchObject({ success: false, error: expect.stringContaining('communication') }))
    expect(result.current.isLoading).toBe(false)
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'

import { useAISearchAssistant, type AISearchResponsePayload } from '@/hooks/useAISearchAssistant'

const trackEventMock = jest.fn()
const updateSessionMock = jest.fn()
const getIdTokenMock = jest.fn()
let mockFirebaseUser: { getIdToken: jest.Mock } | null
let mockCurrentUser: Record<string, unknown> | null
let mockSession: Record<string, unknown> | null

jest.mock('@/firebase/auth', () => ({
  auth: {
    get currentUser() {
      return mockFirebaseUser
    },
  },
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, update: updateSessionMock }),
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockCurrentUser, isFirebaseConnected: true }),
}))

jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: {
    AI_SEARCH_MESSAGE_SENT: 'ai_message_sent',
    AI_SEARCH_SEARCH_CALL: 'ai_search_call',
    AI_SEARCH_CREDIT_DEBITED: 'ai_credit_debited',
    AI_SEARCH_RESULT_CLICK: 'ai_result_click',
  },
  useTrackEvent: () => ({ trackEvent: trackEventMock }),
}))

function payload(overrides: Partial<AISearchResponsePayload> = {}): AISearchResponsePayload {
  return {
    success: true,
    conversationId: 'conversation-hook-9c',
    assistantMessage: 'Trois logements correspondent.',
    suggestedActions: [{ type: 'APPLY_FILTERS', label: 'Élargir', reason: 'Plus de choix', payload: { maxPrice: 550000 } }],
    search: {
      ran: true,
      query: 'maison',
      filters: 'state:IN_PROGRESS',
      queryId: 'query-hook-9c',
      indexName: 'properties-test',
      appliedFilters: { maxPrice: 500000, typeProperty: ['Home'], tags: ['Meublé'], status: ['FOR_RENT'] },
      nbHits: 3,
      hits: [{ objectID: 'property-hook-1' }, { id: 'property-hook-2' }],
      resultStatus: 'few',
    },
    usage: { searchCallsDelta: 1, searchCallsTotal: 2, inputTokens: 20, outputTokens: 30 },
    billing: { creditsDebited: 1, creditsRemaining: 8, creditsDebitedTotal: 2, transactionId: 'tx-hook-9c' },
    finance: { costEstimatedFcfa: 5, revenueEstimatedFcfa: 250, marginRate: 0.98 },
    ...overrides,
  }
}

describe('useAISearchAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFirebaseUser = { getIdToken: getIdTokenMock }
    mockCurrentUser = { uid: 'user-hook-9c', credits: 9 }
    mockSession = { user: { uid: 'user-hook-9c', credits: 9, name: 'Glenn' } }
    getIdTokenMock.mockResolvedValue('firebase-token-hook-9c')
    updateSessionMock.mockResolvedValue(undefined)
    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: { randomUUID: () => 'conversation-hook-9c' },
    })
  })

  it('expose son état initial et refuse un message vide', async () => {
    const { result } = renderHook(() => useAISearchAssistant({ initialFilters: { city: 'Libreville' } }))
    expect(result.current.conversationId).toBe('conversation-hook-9c')
    expect(result.current.messages[0].role).toBe('system')
    expect(result.current.filters).toEqual({ city: 'Libreville' })
    expect(result.current.creditsAvailable).toBe(9)
    await expect(result.current.sendMessage('   ')).resolves.toEqual({ success: false, error: 'Message vide' })
  })

  it('signale Firebase indisponible après avoir conservé le message utilisateur', async () => {
    mockFirebaseUser = null
    const { result } = renderHook(() => useAISearchAssistant())
    await act(async () => {
      await result.current.sendMessage('Je cherche une maison')
    })
    expect(result.current.lastError).toContain('Connexion Firebase en cours')
    expect(result.current.messages.map((message) => message.role)).toEqual(['system', 'user', 'error'])
  })

  it('fusionne les filtres, met à jour résultats, crédits et session', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload() })
    const { result } = renderHook(() => useAISearchAssistant({
      initialFilters: { typeProperty: ['Home'], tags: ['Parking'], status: ['FOR_RENT'] },
      entrypointSource: 'search_cta',
    }))

    let sendResult: unknown
    await act(async () => {
      sendResult = await result.current.sendMessage('Maison meublée', {
        overrideFilters: { typeProperty: ['Home', 'Villa'], tags: ['Parking', 'Meublé'], status: ['FOR_RENT'] },
      })
    })

    expect(sendResult).toEqual({ success: true })
    expect(result.current.messages.at(-1)).toMatchObject({ role: 'assistant', creditsDebited: 1 })
    expect(result.current.results).toHaveLength(2)
    expect(result.current.nbHits).toBe(3)
    expect(result.current.resultStatus).toBe('few')
    expect(result.current.searchCallsTotal).toBe(2)
    expect(result.current.creditsDebitedTotal).toBe(2)
    expect(result.current.filters).toMatchObject({ maxPrice: 500000, typeProperty: ['Home'] })
    expect(updateSessionMock).toHaveBeenCalledWith({ user: expect.objectContaining({ credits: 8 }) })
    expect(trackEventMock).toHaveBeenCalledWith('ai_message_sent', expect.any(Object))
    expect(trackEventMock).toHaveBeenCalledWith('ai_search_call', expect.objectContaining({ nb_hits: 3 }))
    expect(trackEventMock).toHaveBeenCalledWith('ai_credit_debited', expect.objectContaining({ credits_debited: 1 }))

    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(requestBody.currentFilters).toMatchObject({
      typeProperty: ['Home', 'Villa'],
      tags: ['Parking', 'Meublé'],
      status: ['FOR_RENT'],
    })
  })

  it('conserve les résultats lors d une réponse sans recherche', async () => {
    const firstPayload = payload()
    const noSearchPayload = payload({
      search: { ...firstPayload.search, ran: false, hits: [], nbHits: 0, queryId: null, indexName: null },
      usage: { ...firstPayload.usage, searchCallsDelta: 0 },
      billing: { ...firstPayload.billing, creditsDebited: 0 },
    })
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => firstPayload })
      .mockResolvedValueOnce({ ok: true, json: async () => noSearchPayload })
    const { result } = renderHook(() => useAISearchAssistant())
    await act(async () => { await result.current.sendMessage('Trouve une maison') })
    await act(async () => { await result.current.sendMessage('Merci') })
    expect(result.current.results).toHaveLength(2)
    expect(updateSessionMock).toHaveBeenCalledTimes(1)
  })

  it('expose les erreurs HTTP et réseau sans rester en chargement', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: { message: 'Crédits insuffisants' } }),
    })
    const { result } = renderHook(() => useAISearchAssistant())
    await act(async () => {
      await expect(result.current.sendMessage('Maison')).resolves.toEqual({ success: false, error: 'Crédits insuffisants' })
    })
    expect(result.current.lastError).toBe('Crédits insuffisants')
    expect(result.current.isLoading).toBe(false)

    global.fetch = jest.fn().mockRejectedValue(new Error('hors ligne'))
    await act(async () => {
      await expect(result.current.sendMessage('Appartement')).resolves.toEqual({ success: false, error: 'hors ligne' })
    })
    expect(result.current.lastError).toContain('Erreur réseau')
  })

  it('applique une suggestion et ignore un type non pris en charge', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload() })
    const { result } = renderHook(() => useAISearchAssistant())
    await act(async () => {
      await expect(result.current.applySuggestedAction({ type: 'OTHER' } as any)).resolves.toBeUndefined()
      await expect(result.current.applySuggestedAction({
        type: 'APPLY_FILTERS', label: 'Budget', reason: 'Test', payload: { maxPrice: 700000 },
      })).resolves.toBe(true)
    })
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(requestBody).toMatchObject({ forceSearch: true, currentFilters: { maxPrice: 700000 } })
  })

  it('suit un clic une seule fois et ne bloque pas si Insights échoue', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => payload() })
      .mockRejectedValueOnce(new Error('Insights hors ligne'))
    const { result } = renderHook(() => useAISearchAssistant({ entrypointSource: 'direct' }))
    await act(async () => { await result.current.sendMessage('Maison') })
    await act(async () => {
      await result.current.trackResultClick({ objectID: 'property-hook-1' }, 1)
      await result.current.trackResultClick({ objectID: 'property-hook-1' }, 1)
      await result.current.trackResultClick({}, 2)
    })
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(trackEventMock).toHaveBeenCalledWith('ai_result_click', expect.objectContaining({
      object_id: 'property-hook-1', query_id: 'query-hook-9c', position: 1,
    }))
  })

  it('replie le solde sur la session quand le profil ne contient pas de crédits', async () => {
    mockCurrentUser = { uid: 'user-hook-9c' }
    mockSession = { user: { credits: 6 } }
    const { result } = renderHook(() => useAISearchAssistant())
    await waitFor(() => expect(result.current.creditsAvailable).toBe(6))
  })
})

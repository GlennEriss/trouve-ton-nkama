import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import SearchWithAIPage from '@/components/search-ai/SearchWithAIPage'

const mockSend = jest.fn()
const mockApply = jest.fn()
const mockTrackClick = jest.fn()
const mockTrackEvent = jest.fn()
let mockHook: any
let mockParams = new URLSearchParams()

jest.mock('next/navigation', () => ({ useSearchParams: () => mockParams }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a> }))
jest.mock('@/hooks/useAISearchAssistant', () => ({ __esModule: true, default: (options: any) => { mockHook.options = options; return mockHook } }))
jest.mock('@/features/analytics/tracking', () => ({ trackingEvents: { AI_SEARCH_MESSAGE_SENT: 'message' }, useTrackEvent: () => ({ trackEvent: mockTrackEvent }) }))
jest.mock('@/components/home-page/PropertyCard', () => ({ __esModule: true, default: ({ property }: any) => <button>annonce-{property.objectID}</button> }))
jest.mock('@/components/ads/InlineAdUnit', () => ({ __esModule: true, default: () => <div>publicité-inline</div> }))

describe('SearchWithAIPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams = new URLSearchParams('entry=search_cta&query=maison&city=Libreville&minPrice=40000&maxPrice=bad&typeProperty=Home,Villa&status=FOR_RENT&tags=Meuble,Parking')
    mockHook = {
      messages: [], results: [], nbHits: 0, resultStatus: 'none', searchCallsTotal: 0,
      creditsDebitedTotal: 0, creditsAvailable: 3, isLoading: false, lastError: null,
      isFirebaseConnected: true, sendMessage: mockSend, applySuggestedAction: mockApply,
      trackResultClick: mockTrackClick,
    }
    mockSend.mockResolvedValue(undefined)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: jest.fn() })
  })

  it('parse les filtres initiaux et soumet une recherche', async () => {
    render(<SearchWithAIPage />)
    expect(mockHook.options).toMatchObject({ entrypointSource: 'search_cta', initialFilters: { query: 'maison', city: 'Libreville', minPrice: 40000, maxPrice: undefined, typeProperty: ['Home', 'Villa'], status: ['FOR_RENT'], tags: ['Meuble', 'Parking'] } })
    const input = screen.getByPlaceholderText(/maison 3 chambres/)
    fireEvent.change(input, { target: { value: '  studio Akébé  ' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('studio Akébé', { entrypointSource: 'search_cta' }))
    expect(input).toHaveValue('')
  })

  it('présente messages, consommation, actions et états de synchronisation', () => {
    mockHook = {
      ...mockHook,
      isFirebaseConnected: false,
      searchCallsTotal: 2,
      creditsDebitedTotal: 1,
      creditsAvailable: 2,
      messages: [
        { id: 'u', role: 'user', content: 'Je cherche', createdAt: '2026-07-22T10:00:00Z' },
        { id: 'e', role: 'error', content: 'Erreur IA', createdAt: 'bad', creditsDebited: 1, creditsRemaining: 2 },
        { id: 's', role: 'system', content: 'Conseil', createdAt: '2026-07-22', suggestedActions: [{ label: 'Élargir', reason: 'Plus de résultats', type: 'expand_budget' }] },
      ],
    }
    render(<SearchWithAIPage />)
    expect(screen.getByText(/2 recherche/)).toBeVisible()
    expect(screen.getByText('Synchronisation Firebase en cours...')).toBeVisible()
    expect(screen.getByText('-1 crédit')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Élargir' }))
    expect(mockApply).toHaveBeenCalledWith(expect.objectContaining({ label: 'Élargir' }))
  })

  it('affiche chargement, erreur, résultats et suit les clics', () => {
    mockHook = { ...mockHook, isLoading: true, lastError: 'Service indisponible', nbHits: 8, resultStatus: 'many', results: [{ objectID: 'p1' }, { objectID: 'p2' }] }
    render(<SearchWithAIPage />)
    expect(screen.getByText('Analyse et recherche en cours...')).toBeVisible()
    expect(screen.getByText('Service indisponible')).toBeVisible()
    expect(screen.getByText(/statut suffisant/)).toBeVisible()
    expect(screen.getByText('publicité-inline')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'annonce-p2' }))
    expect(mockTrackClick).toHaveBeenCalledWith({ objectID: 'p2' }, 2)
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  })

  it('préremplit un prompt rapide et trace son origine', () => {
    render(<SearchWithAIPage />)
    fireEvent.click(screen.getByRole('button', { name: /maison 3 chambres/ }))
    expect(screen.getByPlaceholderText(/maison 3 chambres/)).toHaveValue(
      'Je cherche une maison 3 chambres à Libreville max 190000 FCFA'
    )
    expect(mockTrackEvent).toHaveBeenCalledWith('message', { source: 'quick_prompt' })
    expect(screen.getByText(/Lance une recherche/)).toBeVisible()
  })

  it('normalise un entrypoint inconnu et un statut avec peu de résultats', () => {
    mockParams = new URLSearchParams('entry=invalid')
    mockHook = { ...mockHook, resultStatus: 'few', nbHits: 1 }
    render(<SearchWithAIPage />)
    expect(mockHook.options.entrypointSource).toBe('direct')
    expect(screen.getByText(/statut peu/)).toBeVisible()
  })
})

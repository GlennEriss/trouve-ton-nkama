import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import FloatingAssistantButton from '@/components/ai-assistant/FloatingAssistantButton'

const mockSend = jest.fn()
const mockToast = jest.fn()
const mockPrompt = jest.fn((..._args: any[]) => 'AUTO PROMPT')
let mockProperty: any
let mockCredits = 3
let mockLoading = false

jest.mock('@/hooks/useAIAssistant', () => ({ __esModule: true, default: () => ({ sendMessage: mockSend, creditsAvailable: mockCredits, isLoading: mockLoading }) }))
jest.mock('@/hooks/usePropertyType', () => ({ __esModule: true, default: () => mockProperty }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))
jest.mock('@/services/ai-prompts.service', () => ({ __esModule: true, default: { getAutoFillPrompt: (...args: any[]) => mockPrompt(...args) } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))
jest.mock('@/components/ai-assistant/AutoFillModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onGenerate }: any) => isOpen ? <div><button onClick={() => onGenerate('Maison Akébé')}>générer auto</button><button onClick={onClose}>fermer auto</button></div> : null,
}))

describe('FloatingAssistantButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockProperty = { propertyType: 'home', propertyLabel: 'Maison', requiredFields: ['title'], isPropertyForm: true }
    mockCredits = 3
    mockLoading = false
    mockSend.mockResolvedValue({ success: true, response: '{"title":"Belle maison","description":"Calme","price":"40 000 FCFA","area":90,"tags":["Jardin"],"propertyDetails":{"nbrRooms":3}}' })
  })

  it('reste absent hors formulaire immobilier', () => {
    mockProperty = { isPropertyForm: false }
    const { container } = render(<FloatingAssistantButton />)
    expect(container).toBeEmptyDOMElement()
  })

  it('anime le message puis ouvre et ferme le modal', () => {
    jest.useFakeTimers()
    render(<FloatingAssistantButton />)
    act(() => jest.advanceTimersByTime(200))
    expect(screen.getByText(/Je s|\|/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByRole('button', { name: 'générer auto' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'fermer auto' }))
    expect(screen.queryByRole('button', { name: 'générer auto' })).not.toBeInTheDocument()
    act(() => jest.runOnlyPendingTimers())
    jest.useRealTimers()
  })

  it('génère, normalise et sauvegarde le formulaire', async () => {
    render(<FloatingAssistantButton formContext={{ activeStep: 1 }} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByRole('button', { name: 'générer auto' }))
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('AUTO PROMPT', { activeStep: 1 }))
    expect(JSON.parse(localStorage.getItem('property_form_draft')!)).toEqual(expect.objectContaining({ typeProperty: 'HOME', title: 'Belle maison', price: 40000, area: 90, nbrRooms: 3 }))
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })

  it('borne les nombres invalides et retire les images avant sauvegarde', async () => {
    mockSend.mockResolvedValueOnce({ success: true, response: '```json\n{"title":"Terrain","description":"","price":-1,"area":"x","images":["bad"],"propertyDetails":{}}\n```' })
    render(<FloatingAssistantButton />)
    fireEvent.click(screen.getAllByRole('button')[0])
    fireEvent.click(screen.getByRole('button', { name: 'générer auto' }))
    await waitFor(() => expect(localStorage.getItem('property_form_draft')).not.toBeNull())
    expect(JSON.parse(localStorage.getItem('property_form_draft')!)).toMatchObject({ price: 0, area: 0 })
    expect(localStorage.getItem('property_form_draft')).not.toContain('images')
  })

  it('affiche les réponses refusées, JSON invalides et pannes réseau', async () => {
    mockSend.mockResolvedValueOnce({ success: false, error: 'Gemini indisponible' })
    const { rerender } = render(<FloatingAssistantButton />)
    fireEvent.click(screen.getAllByRole('button')[0]); fireEvent.click(screen.getByRole('button', { name: 'générer auto' }))
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Erreur de génération') })))

    mockSend.mockResolvedValueOnce({ success: true, response: 'pas json' })
    fireEvent.click(screen.getAllByRole('button')[0]); fireEvent.click(screen.getByRole('button', { name: 'générer auto' }))
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Erreur de traitement') })))

    mockSend.mockRejectedValueOnce(new Error('network'))
    fireEvent.click(screen.getAllByRole('button')[0]); fireEvent.click(screen.getByRole('button', { name: 'générer auto' }))
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Erreur inattendue') })))
    rerender(<FloatingAssistantButton />)
  })

  it('désactive le bouton sans crédit ou pendant le chargement', () => {
    mockCredits = 0
    const { rerender } = render(<FloatingAssistantButton />)
    expect(screen.getAllByRole('button')[0]).toBeDisabled()
    mockCredits = 3; mockLoading = true
    rerender(<FloatingAssistantButton />)
    expect(screen.getAllByRole('button')[0]).toBeDisabled()
  })
})

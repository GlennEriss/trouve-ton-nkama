import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import AssistantChatModal from '@/components/ai-assistant/AssistantChatModal'

const sendMessageMock = jest.fn()
const openRechargeMock = jest.fn()
const promptMock = jest.fn((..._args: any[]) => 'PROMPT AUTO')
let mockCredits = 3
let mockLoading = false

jest.mock('@/hooks/useAIAssistant', () => ({
  __esModule: true,
  default: () => ({ sendMessage: sendMessageMock, creditsAvailable: mockCredits, isLoading: mockLoading }),
}))
jest.mock('@/hooks/usePropertyType', () => ({
  __esModule: true,
  default: () => ({ propertyType: 'HOME', propertyLabel: 'Maison', requiredFields: ['title'] }),
}))
jest.mock('@/providers/RechargeProvider', () => ({ useRecharge: () => ({ openRecharge: openRechargeMock }) }))
jest.mock('@/services/ai-prompts.service', () => ({ __esModule: true, default: { getAutoFillPrompt: (...args: any[]) => promptMock(...args) } }))
jest.mock('@/lib/logger', () => {
  const error = jest.fn()
  return { createLogger: () => ({ debug: jest.fn(), error }), __error: error }
})
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <section>{children}</section>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))
jest.mock('@/components/ui/scroll-area', () => ({ ScrollArea: ({ children }: any) => <div>{children}</div> }))
jest.mock('@/components/ai-assistant/ChatMessage', () => ({
  __esModule: true,
  default: ({ message }: any) => <div data-testid={`message-${message.type}`}>{message.content}</div>,
}))
jest.mock('@/components/ai-assistant/SmartSuggestions', () => ({
  __esModule: true,
  default: ({ onSuggestionClick, disabled }: any) => <div>
    <button disabled={disabled} onClick={() => onSuggestionClick('Analyser mon formulaire')}>analyser</button>
    <button disabled={disabled} onClick={() => onSuggestionClick('AUTO_FILL_PROPERTY:home')}>auto-remplir</button>
    <button disabled={disabled} onClick={() => onSuggestionClick('Quel prix ?')}>suggestion libre</button>
  </div>,
}))
jest.mock('@/components/ai-assistant/AutoFillModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onGenerate }: any) => isOpen ? <div>
    <button onClick={() => onGenerate('Maison à Akébé')}>confirmer auto</button>
    <button onClick={onClose}>fermer auto</button>
  </div> : null,
}))

describe('AssistantChatModal', () => {
  const onClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCredits = 3
    mockLoading = false
    localStorage.clear()
    sendMessageMock.mockResolvedValue({ success: true, response: 'Conseil utile', creditsRemaining: 2 })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: jest.fn() })
  })

  it('initialise les messages de bienvenue et le compteur de crédits', async () => {
    render(<AssistantChatModal isOpen onClose={onClose} formContext={{ activeStep: 1 }} />)
    expect(await screen.findByRole('heading', { name: 'Assistant IA Immobilier' })).toBeVisible()
    expect(screen.getByText('3 crédits')).toBeVisible()
    expect(await screen.findAllByTestId('message-system')).toHaveLength(3)
    expect(screen.getByPlaceholderText('Posez votre question...')).toHaveFocus()
  })

  it('envoie avec Entrée, enrichit le contexte et détecte une superficie', async () => {
    localStorage.setItem('property_form_draft', JSON.stringify({ title: 'Studio' }))
    sendMessageMock.mockResolvedValueOnce({ success: true, response: 'Superficie: 45 m²', creditsRemaining: 2 })
    render(<AssistantChatModal isOpen onClose={onClose} formContext={{ activeStep: 2, custom: true }} />)
    const input = screen.getByPlaceholderText('Posez votre question...')
    fireEvent.change(input, { target: { value: '  analyse ce bien  ' } })
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 })
    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledWith('analyse ce bien', expect.objectContaining({
      currentFormData: { title: 'Studio' }, currentStep: 2, availableCredits: 3,
    })))
    expect(await screen.findByText('Superficie: 45 m²')).toBeVisible()
    expect(screen.getByText(/définir la superficie à 45 m²/)).toBeVisible()
    expect(input).toHaveValue('')
  })

  it('n’ajoute pas de suggestion de superficie déjà renseignée', async () => {
    localStorage.setItem('property_form_draft', JSON.stringify({ area: 70 }))
    sendMessageMock.mockResolvedValueOnce({ success: true, response: 'superficie 90 m²' })
    render(<AssistantChatModal isOpen onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('Posez votre question...'), { target: { value: 'test' } })
    fireEvent.keyPress(screen.getByPlaceholderText('Posez votre question...'), { key: 'Enter', charCode: 13 })
    await screen.findByText('superficie 90 m²')
    expect(screen.queryByText(/Suggestion détectée/)).not.toBeInTheDocument()
  })

  it('affiche les échecs métier et techniques', async () => {
    sendMessageMock.mockResolvedValueOnce({ success: false, error: 'Crédits insuffisants' })
    const { rerender } = render(<AssistantChatModal isOpen onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('Posez votre question...'), { target: { value: 'question' } })
    fireEvent.keyPress(screen.getByPlaceholderText('Posez votre question...'), { key: 'Enter', charCode: 13 })
    expect(await screen.findByText('Crédits insuffisants')).toBeVisible()

    sendMessageMock.mockRejectedValueOnce(new Error('réseau'))
    fireEvent.change(screen.getByPlaceholderText('Posez votre question...'), { target: { value: 'encore' } })
    fireEvent.keyPress(screen.getByPlaceholderText('Posez votre question...'), { key: 'Enter', charCode: 13 })
    expect(await screen.findByText(/Erreur inattendue lors de la communication/)).toBeVisible()
    expect(jest.requireMock('@/lib/logger').__error).toHaveBeenCalled()
    rerender(<AssistantChatModal isOpen onClose={onClose} />)
  })

  it('analyse le brouillon depuis une suggestion rapide', async () => {
    localStorage.setItem('property_form_draft', JSON.stringify({ price: 40000 }))
    render(<AssistantChatModal isOpen onClose={onClose} formContext={{ activeStep: 0 }} />)
    fireEvent.click(await screen.findByRole('button', { name: 'analyser' }))
    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledWith(expect.stringContaining('40000'), { activeStep: 0 }))
    expect(screen.getByText('📊 Analyser mon formulaire actuel')).toBeVisible()
  })

  it('préremplit une suggestion libre', async () => {
    render(<AssistantChatModal isOpen onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { name: 'suggestion libre' }))
    expect(screen.getByPlaceholderText('Posez votre question...')).toHaveValue('Quel prix ?')
  })

  it('génère et sauvegarde un formulaire depuis le modal automatique', async () => {
    sendMessageMock.mockResolvedValueOnce({
      success: true,
      response: '```json\n{"title":"Maison moderne","description":"Une très belle maison proche de toutes commodités avec jardin","area":100,"price":"40 000 FCFA","tags":["Jardin"],"propertyDetails":{"nbrRooms":3},"confidence":95,"suggestions":["Ajouter des photos"]}\n```',
      creditsRemaining: 2,
    })
    render(<AssistantChatModal isOpen onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { name: 'auto-remplir' }))
    fireEvent.click(screen.getByRole('button', { name: 'confirmer auto' }))
    await waitFor(() => expect(promptMock).toHaveBeenCalled())
    await waitFor(() => expect(JSON.parse(localStorage.getItem('property_form_draft')!)).toEqual(expect.objectContaining({ price: 40000, area: 100, nbrRooms: 3 })))
    expect(await screen.findByText(/Formulaire généré avec succès/)).toBeVisible()
  })

  it('signale une réponse auto invalide et une génération refusée', async () => {
    sendMessageMock.mockResolvedValueOnce({ success: true, response: 'pas du json' })
    render(<AssistantChatModal isOpen onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { name: 'auto-remplir' }))
    fireEvent.click(screen.getByRole('button', { name: 'confirmer auto' }))
    expect(await screen.findByText(/Erreur lors de l'analyse/)).toBeVisible()
  })

  it('ouvre la recharge lorsque les crédits sont épuisés', () => {
    mockCredits = 0
    render(<AssistantChatModal isOpen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Recharger des crédits/ }))
    expect(openRechargeMock).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'analyser' })).toBeDisabled()
  })

  it('tolère un brouillon localStorage corrompu', async () => {
    localStorage.setItem('property_form_draft', '{bad')
    render(<AssistantChatModal isOpen onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('Posez votre question...'), { target: { value: 'bonjour' } })
    fireEvent.keyPress(screen.getByPlaceholderText('Posez votre question...'), { key: 'Enter', charCode: 13 })
    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledWith('bonjour', expect.objectContaining({ currentFormData: {} })))
    expect(jest.requireMock('@/lib/logger').__error).toHaveBeenCalled()
  })
})

import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import PasswordResetFailure from '@/components/password-reset/PasswordResetFailure'
import { RegisterSuccess } from '@/components/signup/RegisterSuccess'
import SmartSuggestions from '@/components/ai-assistant/SmartSuggestions'

const pushMock = jest.fn()
const toastMock = jest.fn()
let propertyContext = {
  propertyType: 'home',
  propertyLabel: 'maison',
  requiredFields: ['titre', 'prix', 'ville', 'quartier', 'description'],
  isPropertyForm: true,
}

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a>,
}))
jest.mock('@trouve-ton-nkama/ui/logo', () => ({ __esModule: true, default: () => <span>Logo Nkama</span> }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: jest.fn(), error: jest.fn() }),
}))
jest.mock('@/hooks/usePropertyType', () => ({
  __esModule: true,
  default: () => propertyContext,
}))
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      variants: _variants,
      custom: _custom,
      whileHover: _whileHover,
      ...props
    }: any) => React.createElement(tag, props, children),
  }),
}))
jest.mock('@/components/shared/ui/ButtonApp', () => ({
  ButtonApp: ({ title, ...props }: any) => <button {...props}>{title}</button>,
}))

describe('PasswordResetFailure', () => {
  beforeEach(() => jest.clearAllMocks())

  it('explique les causes et expose les contacts du support', () => {
    render(<PasswordResetFailure />)
    expect(screen.getByRole('heading', { name: 'Lien invalide ou expiré' })).toBeVisible()
    expect(screen.getByText(/Le lien a déjà été utilisé/)).toBeVisible()
    expect(screen.getByRole('link', { name: /Retour à l'accueil/ })).toHaveAttribute('href')
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href')?.startsWith('mailto:'))).toBe(true)
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href')?.startsWith('tel:'))).toBe(true)
  })

  it('permet de redemander un lien ou de retourner à la connexion', () => {
    render(<PasswordResetFailure />)
    fireEvent.click(screen.getByRole('button', { name: 'Demander un nouveau lien' }))
    fireEvent.click(screen.getByRole('button', { name: /Retour à la connexion/ }))
    expect(pushMock).toHaveBeenCalledTimes(2)
  })
})

describe('RegisterSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    global.fetch = jest.fn()
  })

  it.each([
    [true, 'Votre email a été vérifié !'],
    [false, "Votre email n'est pas encore vérifié"],
  ])('affiche le statut de vérification %s', async (verified, message) => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ emailVerified: verified }) })
    render(<RegisterSuccess uid="user-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le statut' }))
    expect(screen.getByRole('button', { name: 'Vérification...' })).toBeDisabled()
    expect(await screen.findByText(new RegExp(message))).toBeVisible()
    expect(fetch).toHaveBeenCalledWith('/api/verify-email', expect.objectContaining({ body: '{"uid":"user-1"}' }))
    expect(toastMock).toHaveBeenCalledTimes(verified ? 1 : 0)
  })

  it('absorbe un statut serveur invalide et une panne réseau', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'unknown-user' }) })
      .mockRejectedValueOnce(new Error('offline'))
    render(<RegisterSuccess uid="user-2" />)
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le statut' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Vérifier le statut' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le statut' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('renvoie le courriel puis réactive le bouton après le compte à rebours', async () => {
    jest.useFakeTimers()
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })
    render(<RegisterSuccess uid="user-3" />)
    fireEvent.click(screen.getByRole('button', { name: /Renvoyer l'email/ }))
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Email renvoyé' })))
    expect(screen.getByRole('button', { name: 'Renvoyer dans 60s' })).toBeDisabled()
    act(() => jest.advanceTimersByTime(60_000))
    expect(screen.getByRole('button', { name: /Renvoyer l'email/ })).toBeEnabled()
    jest.useRealTimers()
  })

  it('signale un échec de renvoi', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    render(<RegisterSuccess uid="user-4" />)
    fireEvent.click(screen.getByRole('button', { name: /Renvoyer l'email/ }))
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })))
  })
})

describe('SmartSuggestions', () => {
  const onSuggestionClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    propertyContext = {
      propertyType: 'home',
      propertyLabel: 'maison',
      requiredFields: ['titre', 'prix', 'ville', 'quartier', 'description'],
      isPropertyForm: true,
    }
  })

  it('propose le remplissage automatique et contextualise la description', () => {
    render(<SmartSuggestions formData={{ description: 'Maison lumineuse' }} onSuggestionClick={onSuggestionClick} />)
    expect(screen.getByText(/Générateur automatique/, { selector: 'p' })).toHaveTextContent(
      'Générateur automatique pour maison'
    )
    expect(screen.getByText(/titre, prix, ville, quartier/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Générer mon maison/ }))
    fireEvent.click(screen.getByRole('button', { name: /Améliorer ma description/ }))
    fireEvent.click(screen.getByRole('button', { name: /Analyse complète du formulaire/ }))
    expect(onSuggestionClick).toHaveBeenNthCalledWith(1, 'AUTO_FILL_PROPERTY:home')
    expect(onSuggestionClick).toHaveBeenNthCalledWith(2, 'Améliore cette description : "Maison lumineuse"')
    expect(onSuggestionClick).toHaveBeenNthCalledWith(3, expect.stringContaining('Analyse complète'))
  })

  it.each([
    [1, 'Optimiser les détails'],
    [2, 'Valoriser ma localisation'],
    [3, 'Analyser mon annonce'],
    [9, 'Comment commencer ?'],
  ])('rend les suggestions de l’étape %i', (step, expected) => {
    render(
      <SmartSuggestions
        activeStep={step}
        formData={step === 2 ? { city: 'Libreville' } : undefined}
        onSuggestionClick={onSuggestionClick}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: new RegExp(expected) }))
    expect(onSuggestionClick).toHaveBeenCalled()
    if (step === 2) expect(onSuggestionClick).toHaveBeenCalledWith(expect.stringContaining('Libreville'))
    if (step === 3) expect(screen.queryByRole('button', { name: /Générer mon maison/ })).not.toBeInTheDocument()
  })

  it('fonctionne hors formulaire immobilier et respecte disabled', () => {
    propertyContext = { ...propertyContext, propertyType: '', propertyLabel: '', isPropertyForm: false }
    render(<SmartSuggestions disabled onSuggestionClick={onSuggestionClick} />)
    expect(screen.queryByText(/Générateur automatique/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Améliorer ma description/ }))
    expect(onSuggestionClick).not.toHaveBeenCalled()
  })
})

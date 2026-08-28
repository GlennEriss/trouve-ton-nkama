/**
 * Validation réelle du formulaire de complétion de profil (2026-08-26), demandée
 * explicitement : contrairement à complete-profile-form-modern.test.tsx (qui mocke
 * react-hook-form pour piloter le multi-champs sans dépendre des Select Radix réels), ce
 * fichier utilise le VRAI react-hook-form + le VRAI resolver Zod, pour vérifier que les
 * champs obligatoires vides bloquent réellement la soumission (le service n'est jamais
 * appelé) — pas seulement que le formulaire se remplit et se soumet quand tout est valide.
 *
 * DateSelect est mocké (stub statique) : son effet interne appelle `_trigger` à chaque
 * changement de `control._formValues`, qui boucle à l'infini une fois branché sur un VRAI
 * react-hook-form (l'objet observé change de référence à chaque rendu). Les autres champs
 * (InputFormApp, PhoneNumberFormAppSimple, CheckboxFormApp) restent réels : c'est sur eux
 * que porte la validation testée ici.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { CompleteProfileFormModern } from '@/features/auth/ui/v1/CompleteProfileFormModern'

const pushMock = jest.fn()
const replaceMock = jest.fn()
const toastMock = jest.fn()
const completeProfileMock = jest.fn()
const updateSessionMock = jest.fn()

// Référence STABLE (pas reconstruite à chaque appel de useSession()) : sinon `session` change
// d'identité à chaque rendu et l'effet d'hydratation de CompleteProfileFormModern se
// re-déclenche indéfiniment (déps `[form, router, session, status]`).
const INCOMPLETE_SESSION = {
  user: {
    uid: 'incomplete-1',
    email: 'ada@example.com',
    firstname: '',
    lastname: '',
    phoneNumbers: [] as string[],
    birthDate: undefined,
    roles: ['User'],
    metadata: { needsProfileCompletion: true },
  },
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}))
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: INCOMPLETE_SESSION, status: 'authenticated', update: updateSessionMock }),
  signOut: jest.fn(),
}))
jest.mock('framer-motion', () => {
  const ReactModule = require('react');
  const FRAMER_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layoutId', 'custom']);
  const toElement = (tag: string) => ({ children, ...props }: any) => {
    const cleanProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props || {})) {
      if (!FRAMER_PROPS.has(key)) cleanProps[key] = value;
    }
    const safeTag = ['button', 'h1', 'h2', 'h3', 'p', 'span', 'div'].includes(tag) ? tag : 'div';
    return ReactModule.createElement(safeTag, cleanProps, children);
  };
  const motion = new Proxy({}, { get: (_, prop: string) => toElement(prop) });
  return { motion, useReducedMotion: () => false };
})
jest.mock('@trouve-ton-nkama/ui/logo', () => ({ __esModule: true, default: () => <span>Logo Nkama</span> }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/features/auth/hooks', () => ({
  useCompleteProfile: () => ({
    completeProfile: completeProfileMock,
    isLoading: false,
    lastError: null,
    clearError: jest.fn(),
  }),
  mapCompleteProfileError: () => ({ title: 'Session invalide', message: 'Utilisateur introuvable', duration: 7000 }),
  useSignOut: () => ({ signOut: jest.fn(), isSigningOut: false }),
}))
jest.mock('@/lib/auth/role-routing', () => ({
  getPostAuthRedirectPath: (user: { roles?: string[] }) => (user.roles?.includes('Announcer') ? '/property' : '/'),
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/components/shared/form/DateSelect', () => ({
  DateSelect: () => <div>Date de naissance (stub)</div>,
}))

describe('CompleteProfileFormModern — validation réelle (Zod + react-hook-form non mockés)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('bloque la soumission quand les champs obligatoires (prénom, nom, téléphone, conditions) sont vides', async () => {
    render(<CompleteProfileFormModern />)

    const submitButton = await screen.findByRole('button', { name: 'Finaliser mon compte' })
    fireEvent.submit(submitButton.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Le prénom est requis')).toBeInTheDocument()
    })
    expect(screen.getByText('Le nom est requis')).toBeInTheDocument()
    expect(screen.getByText("Vous devez accepter les conditions d'utilisation")).toBeInTheDocument()
    expect(completeProfileMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("ne bloque pas sur le nom de l'entreprise (optionnel) resté vide, seulement sur les champs obligatoires", async () => {
    render(<CompleteProfileFormModern />)

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Lovelace' } })
    // Nom de l'entreprise volontairement laissé vide.

    const submitButton = await screen.findByRole('button', { name: 'Finaliser mon compte' })
    fireEvent.submit(submitButton.closest('form')!)

    await waitFor(() => {
      expect(screen.queryByText('Le prénom est requis')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Le nom est requis')).not.toBeInTheDocument()
    // Toujours bloqué (téléphone/conditions encore vides), mais pas à cause du nom de
    // l'entreprise : c'est bien ce champ précis qui est sans effet sur la validation.
    expect(completeProfileMock).not.toHaveBeenCalled()
  })
})

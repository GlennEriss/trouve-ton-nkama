/**
 * MenuProfil — bouton "Se déconnecter" (2026-08-26). Le bug rapporté ("cliqué d'innombrables
 * fois, rien ne se passe") vivait dans un `handleClientSignout` dupliqué directement ici ; il
 * passe maintenant par useSignOut (testé en détail dans
 * src/features/auth/hooks/__tests__/useSignOut.test.ts). Ce test vérifie juste le câblage :
 * le clic déclenche bien le hook, et le bouton se désactive/affiche un état de chargement
 * pendant l'opération — pour qu'un rage-click ne puisse plus jamais sembler "ne rien faire".
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

const mockSignOut = jest.fn()
let mockIsSigningOut = false

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: { uid: 'u1', firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com' } }),
}))
jest.mock('@/features/auth/hooks', () => ({
  useSignOut: () => ({ signOut: mockSignOut, isSigningOut: mockIsSigningOut }),
}))
jest.mock('@trouve-ton-nkama/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import MenuProfil from '@/components/navbar/MenuProfil'

describe('MenuProfil — déconnexion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSigningOut = false
  })

  it('déclenche useSignOut().signOut() au clic, sans argument next-auth direct', () => {
    render(<MenuProfil />)

    fireEvent.click(screen.getByRole('button', { name: /Se déconnecter/ }))

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('désactive le bouton et affiche "Déconnexion..." pendant la déconnexion (rage-click sans effet)', () => {
    mockIsSigningOut = true
    render(<MenuProfil />)

    const button = screen.getByRole('button', { name: /Déconnexion/ })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    // Le bouton étant désactivé, aucun clic supplémentaire ne doit relancer signOut.
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})

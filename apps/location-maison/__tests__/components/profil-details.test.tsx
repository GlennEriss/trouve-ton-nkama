import React from 'react'
import { render, screen } from '@testing-library/react'

import ProfilDetails from '@/components/profil/ProfilDetails'

let windowWidth: number
let userState: any

jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: windowWidth, height: 800 }) }))
jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: userState }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const linkFor = (label: string) => screen.getByRole('link', { name: new RegExp(label) })

describe('ProfilDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    windowWidth = 1280
    userState = { uid: 'u1', roles: ['User'] }
  })

  describe('desktop', () => {
    it('donne acces aux favoris depuis le profil', () => {
      render(<ProfilDetails />)
      expect(linkFor('Favoris')).toHaveAttribute('href', '/favoris')
    })

    it('liste les entrees de compte principales', () => {
      render(<ProfilDetails />)
      expect(linkFor('Mon solde')).toBeInTheDocument()
      expect(linkFor('Faire de la pub')).toBeInTheDocument()
      expect(linkFor('Connexion et sécurité')).toBeInTheDocument()
      expect(linkFor('Paramètre')).toBeInTheDocument()
    })

    it('renvoie vers les pages legales publiques', () => {
      render(<ProfilDetails />)
      expect(linkFor('Politique de confidentialité')).toHaveAttribute('href', '/privacy-policy')
      expect(linkFor("Condition d'utilisations")).toHaveAttribute('href', '/terms-of-use')
    })

    it('propose de devenir annonceur a un simple utilisateur', () => {
      render(<ProfilDetails />)
      expect(linkFor('Devenir annonceur')).toHaveAttribute('href', '/profil/devenir-annonceur')
    })

    it('masque l entree devenir annonceur pour un annonceur', () => {
      userState = { uid: 'u1', roles: ['Announcer'] }
      render(<ProfilDetails />)
      expect(screen.queryByText('Devenir annonceur')).not.toBeInTheDocument()
    })

    it('affiche une description pour chaque entree', () => {
      render(<ProfilDetails />)
      expect(screen.getByText(/annonces que vous avez sauvegardées/)).toBeInTheDocument()
    })
  })

  describe('mobile', () => {
    it('rend la meme navigation en liste compacte', () => {
      windowWidth = 375
      render(<ProfilDetails />)

      expect(linkFor('Favoris')).toHaveAttribute('href', '/favoris')
      expect(linkFor('Mon solde')).toBeInTheDocument()
      // La variante compacte n'affiche que les libelles, pas les descriptions.
      expect(screen.queryByText(/annonces que vous avez sauvegardées/)).not.toBeInTheDocument()
    })

    it('propose devenir annonceur a un simple utilisateur', () => {
      windowWidth = 375
      render(<ProfilDetails />)
      expect(linkFor('Devenir annonceur')).toBeInTheDocument()
    })
  })

  it('tolere une session sans roles', () => {
    userState = { uid: 'u1' }
    expect(() => render(<ProfilDetails />)).not.toThrow()
    expect(linkFor('Devenir annonceur')).toBeInTheDocument()
  })
})

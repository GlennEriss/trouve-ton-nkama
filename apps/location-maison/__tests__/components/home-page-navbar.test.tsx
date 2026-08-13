import React from 'react'
import { render, screen } from '@testing-library/react'

import Navbar from '@/components/home-page/Navbar'

let windowWidth: number
let userState: any
let pathname: string

jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: windowWidth, height: 800 }) }))
jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: userState }) }))
jest.mock('next/navigation', () => ({ usePathname: () => pathname }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('@trouve-ton-nkama/ui/logo', () => ({ __esModule: true, default: () => <span>Logo</span> }))
jest.mock('@/components/home-page/InputSearchNavbar', () => ({
  __esModule: true,
  default: () => <div data-testid="search-navbar" />,
}))
jest.mock('@/components/navbar/MenuProfil', () => ({ __esModule: true, default: () => <div data-testid="menu-profil" /> }))
jest.mock('@/components/navbar/Notifications', () => ({ __esModule: true, default: () => <div data-testid="notifications" /> }))
jest.mock('@trouve-ton-nkama/ui/button', () => ({ Button: ({ children, asChild, ...props }: any) => <div {...props}>{children}</div> }))
jest.mock('@trouve-ton-nkama/ui/navigation-menu', () => ({
  NavigationMenu: ({ children }: any) => <nav>{children}</nav>,
  NavigationMenuList: ({ children }: any) => <ul>{children}</ul>,
  NavigationMenuItem: ({ children }: any) => <li>{children}</li>,
  NavigationMenuLink: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    userState = null
    pathname = '/'
  })

  it('ne rend rien sur les routes de creation/edition de reel', () => {
    windowWidth = 1280
    pathname = '/reels/add'
    const { container } = render(<Navbar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ne rend rien sur une route d edition de reel', () => {
    windowWidth = 1280
    pathname = '/reels/abc123/edit'
    const { container } = render(<Navbar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mobile: ne rend rien sur le feed reels', () => {
    windowWidth = 375
    pathname = '/reels'
    const { container } = render(<Navbar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mobile: affiche la barre compacte notifications+profil pour un utilisateur connecte', () => {
    windowWidth = 375
    pathname = '/'
    userState = { uid: 'u1', roles: ['User'] }
    render(<Navbar />)
    expect(screen.getByTestId('notifications')).toBeInTheDocument()
    expect(screen.getByTestId('menu-profil')).toBeInTheDocument()
    expect(screen.queryByTestId('search-navbar')).not.toBeInTheDocument()
  })

  it('mobile: ne rend rien pour un visiteur sur une route protegee', () => {
    windowWidth = 375
    pathname = '/property/add'
    userState = null
    const { container } = render(<Navbar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mobile: affiche la recherche et le bouton connexion pour un visiteur', () => {
    windowWidth = 375
    pathname = '/'
    userState = null
    render(<Navbar />)
    expect(screen.getByTestId('search-navbar')).toBeInTheDocument()
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
  })

  it('mobile: la barre compacte s affiche aussi pour un annonceur connecte (Poster une annonce/Publicite non atteignables en mobile)', () => {
    // Constat: sur mobile, le branchement `if (user) return <compact bar>` intervient avant
    // toute verification isAnnouncer, donc les CTA "Poster une annonce"/"Publicite" du bloc
    // visiteur plus bas ne sont jamais atteints pour un utilisateur connecte en mobile.
    windowWidth = 375
    pathname = '/'
    userState = { uid: 'u1', roles: ['Announcer'] }
    render(<Navbar />)
    expect(screen.getByTestId('notifications')).toBeInTheDocument()
    expect(screen.getByTestId('menu-profil')).toBeInTheDocument()
    expect(screen.queryByText('Poster une annonce')).not.toBeInTheDocument()
  })

  it('desktop: affiche connexion et inscription pour un visiteur', () => {
    windowWidth = 1280
    pathname = '/'
    userState = null
    render(<Navbar />)
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
    expect(screen.getByText("S'inscrire")).toBeInTheDocument()
  })

  it('desktop: affiche notifications et menu profil pour un utilisateur connecte', () => {
    windowWidth = 1280
    pathname = '/'
    userState = { uid: 'u1', roles: ['User'] }
    render(<Navbar />)
    expect(screen.getByTestId('notifications')).toBeInTheDocument()
    expect(screen.getByTestId('menu-profil')).toBeInTheDocument()
  })

  it('desktop: le menu de navigation inclut Mes annonces pour un annonceur', () => {
    windowWidth = 1280
    pathname = '/'
    userState = { uid: 'u1', roles: ['Announcer'] }
    render(<Navbar />)
    expect(screen.getByText('Mes annonces')).toBeInTheDocument()
    expect(screen.getByText('Mes réels')).toBeInTheDocument()
  })
})

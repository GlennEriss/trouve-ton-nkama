import React from 'react'
import { render, screen } from '@testing-library/react'

import Footer from '@/components/footer/Footer'

let pathname = '/'
let currentUser: any = null
let viewportWidth = 390

jest.mock('next/navigation', () => ({ usePathname: () => pathname }))
jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: currentUser }) }))
jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: viewportWidth }) }))
jest.mock('@trouve-ton-nkama/ui/logo', () => ({ __esModule: true, default: () => <span>Logo Nkama</span> }))
jest.mock('@/components/pwa/PWAInstallButton', () => ({ __esModule: true, default: () => <button>Installer l'application</button> }))
jest.mock('@/components/ads/InlineAdUnit', () => ({
  __esModule: true,
  default: ({ slotKey }: any) => <div data-testid="footer-ad">{slotKey}</div>,
}))

describe('Footer', () => {
  beforeEach(() => {
    pathname = '/'
    currentUser = null
    viewportWidth = 390
    process.env.NEXT_PUBLIC_EMAIL_SUPPORT = 'aide@tonnkama.com'
    process.env.NEXT_PUBLIC_CONTACT_SUPPORT = '+24166123456'
  })

  afterEach(() => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_EMAIL_SUPPORT')
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CONTACT_SUPPORT')
  })

  it('rend la navigation, les contacts, le PWA et la publicité sur l’accueil', () => {
    const { container } = render(<Footer />)
    expect(screen.getByText(/simplifie la recherche/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href')
    expect(screen.getByRole('link', { name: 'Maisons à louer' })).toHaveAttribute('href', '/immobilier/location/maison')
    expect(screen.getByRole('link', { name: 'aide@tonnkama.com' })).toHaveAttribute('href', 'mailto:aide@tonnkama.com')
    expect(screen.getByRole('link', { name: 'Contactez-nous sur WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me/24166123456')
    )
    expect(screen.getByRole('button', { name: "Installer l'application" })).toBeVisible()
    expect(screen.getByTestId('footer-ad')).toHaveTextContent('footer-/')
    expect(container.querySelector('footer')).toBeInTheDocument()
  })

  it('lie vers les comptes Instagram et Threads officiels de la plateforme', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Suivez-nous sur Instagram' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/trouvetonnkama/',
    )
    expect(screen.getByRole('link', { name: 'Suivez-nous sur Threads' })).toHaveAttribute(
      'href',
      'https://www.threads.com/@trouvetonkama',
    )
  })

  it('utilise les contacts de repli et masque la publicité sur une page ordinaire', () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_EMAIL_SUPPORT')
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CONTACT_SUPPORT')
    pathname = '/property'
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'support@tonnkama.com' })).toHaveAttribute('href', 'mailto:support@tonnkama.com')
    expect(screen.getByRole('link', { name: 'Contactez-nous sur WhatsApp' })).toHaveAttribute('href', '#')
    expect(screen.queryByTestId('footer-ad')).not.toBeInTheDocument()
  })

  it.each([
    ['masquage explicite', { isHide: true, path: '/', user: null, width: 390 }],
    ['route authentification', { isHide: false, path: '/signin', user: null, width: 390 }],
    ['flux formulaire immobilier', { isHide: false, path: '/property/add/home', user: null, width: 390 }],
    ['membre mobile', { isHide: false, path: '/', user: { uid: 'user-1' }, width: 767 }],
  ])('ne rend rien pour %s', (_label, state) => {
    pathname = state.path
    currentUser = state.user
    viewportWidth = state.width
    const { container } = render(<Footer isHide={state.isHide} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reste visible sur desktop et adapte les pages de recherche immersives', () => {
    currentUser = { uid: 'user-1' }
    viewportWidth = 1200
    pathname = '/search'
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toHaveClass('lg:hidden')
  })

  it.each(['/immobilier/location/maison', '/blog/conseils', '/guide-immobilier-gabon'])(
    'affiche l’emplacement publicitaire sur %s',
    (path) => {
      pathname = path
      render(<Footer />)
      expect(screen.getByTestId('footer-ad')).toHaveTextContent(`footer-${path}`)
    }
  )
})

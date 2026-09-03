/**
 * Middleware — garde-fou /complete-profile (2026-08-26).
 *
 * Bug corrigé : la redirection vers /complete-profile n'était déclenchée que sur les routes
 * protégées ou "invité seulement", jamais sur une route publique. Or PhoneAuthModal (téléphone)
 * ET la connexion Google atterrissent par défaut sur /search — une route publique — donc un
 * compte fraîchement créé avec un profil incomplet ne se faisait jamais rediriger et pouvait
 * naviguer librement. Ces tests verrouillent le comportement pour les deux providers, sur une
 * route publique, protégée, et sur /complete-profile elle-même (pas de boucle).
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const redirectMock = jest.fn((url: URL) => ({ type: 'redirect', url: url.toString() }))
const nextMock = jest.fn(() => ({ type: 'next' }))

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => redirectMock(url),
    next: () => nextMock(),
  },
}))

// `auth()` de next-auth décode normalement la session depuis les cookies/JWT. On le remplace
// par un simple passe-plat identité : le handler du middleware reçoit directement le `req`
// (avec `.auth` déjà posé par le test), sans passer par un vrai décodage de cookie.
jest.mock('next-auth', () => ({
  __esModule: true,
  default: () => ({ auth: (handler: unknown) => handler }),
}))

type MiddlewareRequest = {
  nextUrl: URL
  auth: { user?: Record<string, unknown> } | null
}

function makeRequest(pathname: string, user?: Record<string, unknown> | null): MiddlewareRequest {
  return {
    nextUrl: new URL(`http://localhost:3000${pathname}`),
    auth: user ? { user } : null,
  }
}

const PHONE_SIGNUP_INCOMPLETE = {
  uid: 'uid-phone',
  firstname: '',
  lastname: '',
  phoneNumbers: ['+24166123456'],
  birthDate: undefined,
  roles: ['User', 'Announcer'],
  providers: ['PHONE'],
  metadata: { needsProfileCompletion: true },
}

const GOOGLE_SIGNUP_INCOMPLETE = {
  uid: 'uid-google',
  firstname: 'Ada',
  lastname: 'Lovelace',
  phoneNumbers: [],
  birthDate: undefined,
  roles: ['User'],
  providers: ['GOOGLE'],
  metadata: {},
}

const COMPLETE_ANNOUNCER = {
  uid: 'uid-complete',
  firstname: 'Ada',
  lastname: 'Lovelace',
  phoneNumbers: ['+24166123456'],
  birthDate: '1995-06-15',
  roles: ['User', 'Announcer'],
  providers: ['PHONE'],
  metadata: {},
}

describe('middleware — redirection /complete-profile', () => {
  let middleware: (req: MiddlewareRequest) => Promise<unknown>

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()
    const mod = await import('../../src/middleware')
    middleware = mod.default as unknown as (req: MiddlewareRequest) => Promise<unknown>
  })

  it('redirige un compte téléphone fraîchement créé (profil incomplet) depuis une route PUBLIQUE', async () => {
    await middleware(makeRequest('/search', PHONE_SIGNUP_INCOMPLETE))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock.mock.calls[0][0].pathname).toBe('/complete-profile')
    expect(nextMock).not.toHaveBeenCalled()
  })

  it('redirige un compte Google fraîchement créé (profil incomplet) depuis une route PUBLIQUE', async () => {
    await middleware(makeRequest('/search', GOOGLE_SIGNUP_INCOMPLETE))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock.mock.calls[0][0].pathname).toBe('/complete-profile')
  })

  it('redirige aussi depuis la page d accueil (route publique la plus visitée)', async () => {
    await middleware(makeRequest('/', PHONE_SIGNUP_INCOMPLETE))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock.mock.calls[0][0].pathname).toBe('/complete-profile')
  })

  it('redirige aussi depuis une route protégée (profil incomplet, ex: /profil)', async () => {
    await middleware(makeRequest('/profil', GOOGLE_SIGNUP_INCOMPLETE))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock.mock.calls[0][0].pathname).toBe('/complete-profile')
  })

  it('ne boucle pas : profil incomplet déjà sur /complete-profile → laisse passer', async () => {
    await middleware(makeRequest('/complete-profile', PHONE_SIGNUP_INCOMPLETE))

    expect(redirectMock).not.toHaveBeenCalled()
    expect(nextMock).toHaveBeenCalledTimes(1)
  })

  it('ne redirige pas un profil complet vers /complete-profile', async () => {
    await middleware(makeRequest('/search', COMPLETE_ANNOUNCER))

    expect(redirectMock).not.toHaveBeenCalled()
    expect(nextMock).toHaveBeenCalledTimes(1)
  })

  it('priorise /complete-profile avant le contrôle de rôle annonceur (route protégée + réservée annonceur)', async () => {
    await middleware(makeRequest('/property', PHONE_SIGNUP_INCOMPLETE))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock.mock.calls[0][0].pathname).toBe('/complete-profile')
  })

  it('visiteur non connecté sur une route protégée → renvoyé vers /signin (pas /complete-profile)', async () => {
    await middleware(makeRequest('/profil', null))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock.mock.calls[0][0].pathname).toBe('/signin')
  })

  it('visiteur non connecté sur une route publique → laisse passer', async () => {
    await middleware(makeRequest('/search', null))

    expect(redirectMock).not.toHaveBeenCalled()
    expect(nextMock).toHaveBeenCalledTimes(1)
  })

  it('visiteur non connecté sur /advertising → renvoyé vers /signin (bug réel corrigé le 2026-09-03)', async () => {
    // /advertising vit dans app/(protected)/ mais n'était jamais listé dans
    // PROTECTED_ROUTE_PREFIXES : un visiteur non connecté chargeait quand même la coquille de
    // page (0 crédits, GET /api/advertising/campaigns en 401 -> "Impossible de charger vos
    // publicités") au lieu d'être redirigé vers la connexion — repéré par l'utilisateur sur une
    // vidéo marketing tournée sur cette page.
    await middleware(makeRequest('/advertising', null))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    const redirectUrl = redirectMock.mock.calls[0][0]
    expect(redirectUrl.pathname).toBe('/signin')
    expect(redirectUrl.searchParams.get('callbackUrl')).toBe('/advertising')
  })

  it('visiteur non connecté sur /advertising/create → renvoyé vers /signin (sous-route couverte)', async () => {
    await middleware(makeRequest('/advertising/create', null))

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock.mock.calls[0][0].pathname).toBe('/signin')
  })

  it('compte connecté SANS rôle Annonceur accède à /advertising sans redirection (pas de garde-fou de rôle)', async () => {
    // /api/advertising/campaigns/route.ts n'exige que auth() — n'importe quel compte connecté
    // peut acheter une publicité, contrairement à /property et /reels (ANNOUNCER_ONLY).
    await middleware(makeRequest('/advertising', { ...COMPLETE_ANNOUNCER, roles: ['User'] }))

    expect(redirectMock).not.toHaveBeenCalled()
    expect(nextMock).toHaveBeenCalledTimes(1)
  })
})

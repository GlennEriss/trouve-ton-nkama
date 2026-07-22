const mockFindById = jest.fn()
const mockFindByEmail = jest.fn()
const mockGoogleSignIn = jest.fn()
const mockValidateCredentials = jest.fn()
const mockCreateUser = jest.fn()
const mockUpdateUser = jest.fn()
const mockFirebaseSignin = jest.fn()
const mockSignInWithCredential = jest.fn()
const mockLinkWithCredential = jest.fn()

jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: (options: any) => ({ id: 'google', options }) }))
jest.mock('next-auth/providers/facebook', () => ({ __esModule: true, default: (options: any) => ({ id: 'facebook', options }) }))
jest.mock('next-auth/providers/credentials', () => ({ __esModule: true, default: (options: any) => ({ id: 'credentials', ...options }) }))
jest.mock('@/features/auth/repositories/user.repository', () => ({ userRepository: { findById: (...args: any[]) => mockFindById(...args), findByEmail: (...args: any[]) => mockFindByEmail(...args) } }))
jest.mock('@/features/auth/services/oauth-google.service', () => ({
  handleGoogleSignIn: (...args: any[]) => mockGoogleSignIn(...args),
  validateCredentialsUserForOAuth: (...args: any[]) => mockValidateCredentials(...args),
}))
jest.mock('@/db/user.db', () => ({ createUser: (...args: any[]) => mockCreateUser(...args), updateUser: (...args: any[]) => mockUpdateUser(...args) }))
jest.mock('@/firebase/auth', () => ({
  auth: { name: 'client-auth' },
  GoogleAuthProvider: { credential: (token: string) => ({ googleToken: token }) },
  signInWithEmailAndPassword: (...args: any[]) => mockFirebaseSignin(...args),
}))
jest.mock('firebase/auth', () => ({
  FacebookAuthProvider: { credential: (token: string) => ({ facebookToken: token }) },
  signInWithCredential: (...args: any[]) => mockSignInWithCredential(...args),
  linkWithCredential: (...args: any[]) => mockLinkWithCredential(...args),
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))

describe('configuration NextAuth', () => {
  let config: any
  beforeAll(async () => { config = (await import('@/next-auth/auth.config')).default })
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindByEmail.mockResolvedValue(null)
    mockValidateCredentials.mockReturnValue(null)
    mockGoogleSignIn.mockResolvedValue(true)
    mockCreateUser.mockResolvedValue({ id: 'u1' })
    mockUpdateUser.mockResolvedValue(true)
    mockSignInWithCredential.mockResolvedValue({ user: { uid: 'firebase-u1', phoneNumber: '+24166545430' } })
    mockLinkWithCredential.mockResolvedValue(undefined)
    global.fetch = jest.fn()
  })

  it('configure les trois fournisseurs et autorise des identifiants vérifiés', async () => {
    expect(config.providers.map((provider: any) => provider.id)).toEqual(['google', 'facebook', 'credentials'])
    mockFirebaseSignin.mockResolvedValueOnce({ user: { uid: 'u1', emailVerified: true } })
    mockFindById.mockResolvedValueOnce({ uid: 'u1', email: 'glenn@example.com' })
    await expect(config.providers[2].authorize({ login: 'glenn@example.com', password: 'secret' })).resolves.toMatchObject({ uid: 'u1', emailVerified: true })
  })

  it.each([
    [{ user: { uid: 'u1', emailVerified: false } }, null, 'Email is not verified'],
    [{ user: { uid: 'u1', emailVerified: true } }, null, 'User not found'],
  ])('refuse les identifiants incomplets', async (credential, user, message) => {
    mockFirebaseSignin.mockResolvedValueOnce(credential)
    mockFindById.mockResolvedValueOnce(user)
    await expect(config.providers[2].authorize({ login: 'x', password: 'y' })).rejects.toThrow(message)
  })

  it('préserve les codes et messages d’erreur Firebase', async () => {
    mockFirebaseSignin.mockRejectedValueOnce({ code: 'auth/wrong-password' })
    await expect(config.providers[2].authorize({ login: 'x', password: 'y' })).rejects.toThrow('auth/wrong-password')
    mockFirebaseSignin.mockRejectedValueOnce({ message: 'network' })
    await expect(config.providers[2].authorize({ login: 'x', password: 'y' })).rejects.toThrow('network')
    mockFirebaseSignin.mockRejectedValueOnce('unknown')
    await expect(config.providers[2].authorize({ login: 'x', password: 'y' })).resolves.toBeNull()
  })

  it('route Google et la validation d’un compte credentials', async () => {
    const existing = { uid: 'u1', providers: ['CREDENTIALS'] }
    mockFindByEmail.mockResolvedValueOnce(existing)
    mockValidateCredentials.mockReturnValueOnce('/signin?error=wrong_provider')
    await expect(config.callbacks.signIn({ user: { email: 'x@test.com' }, account: { provider: 'google' }, profile: {}, credentials: undefined })).resolves.toBe('/signin?error=wrong_provider')

    mockFindByEmail.mockResolvedValueOnce(null)
    await expect(config.callbacks.signIn({ user: { email: 'new@test.com' }, account: { provider: 'google' }, profile: { name: 'New' } })).resolves.toBe(true)
    expect(mockGoogleSignIn).toHaveBeenCalled()
    await expect(config.callbacks.signIn({ user: {}, account: { provider: 'credentials' } })).resolves.toBe(true)
  })

  it('crée un nouvel utilisateur Facebook avec ses préférences', async () => {
    await expect(config.callbacks.signIn({ user: { email: 'fb@test.com' }, account: { provider: 'facebook', access_token: 'fb-token' }, profile: { name: 'Facebook User', picture: { data: { url: 'avatar.jpg' } } } })).resolves.toBe(true)
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ uid: 'firebase-u1', firstname: 'Facebook User', providers: ['FACEBOOK'], notificationParameter: expect.objectContaining({ isAccountActivity: true }) }))
  })

  it('lie Facebook à un compte Google existant puis le met à jour', async () => {
    mockFindByEmail.mockResolvedValueOnce({ uid: 'u1', providers: ['GOOGLE'], metadata: { idToken: 'google-id' } })
    await expect(config.callbacks.signIn({ user: { email: 'both@test.com' }, account: { provider: 'facebook', access_token: 'fb-token' }, profile: {} })).resolves.toBe(true)
    expect(mockLinkWithCredential).toHaveBeenCalled()
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', expect.objectContaining({ providers: ['GOOGLE', 'FACEBOOK'], metadata: expect.objectContaining({ accessToken: 'fb-token' }) }))
  })

  it('traduit les erreurs Facebook', async () => {
    await expect(config.callbacks.signIn({ user: { email: 'x' }, account: { provider: 'facebook' }, profile: {} })).resolves.toContain('facebook_missing_access_token')
    mockSignInWithCredential.mockRejectedValueOnce({ code: 'auth/operation-not-allowed' })
    await expect(config.callbacks.signIn({ user: { email: 'x' }, account: { provider: 'facebook', access_token: 'x' }, profile: {} })).resolves.toContain('facebook_provider_disabled')
    mockSignInWithCredential.mockRejectedValueOnce(new Error('facebook down'))
    await expect(config.callbacks.signIn({ user: { email: 'x' }, account: { provider: 'facebook', access_token: 'x' }, profile: {} })).resolves.toContain('facebook_signin_failed')
    mockFindByEmail.mockRejectedValueOnce(new Error('repo down'))
    await expect(config.callbacks.signIn({ user: { email: 'x' }, account: { provider: 'google' }, profile: {} })).resolves.toContain('signin_callback_failed')
  })

  it('hydrate le JWT et sépare les jetons de chaque fournisseur', async () => {
    mockFindByEmail.mockResolvedValueOnce({ uid: 'u1', email: 'x', firstname: 'Glenn', lastname: 'Eriss', phoneNumbers: ['+241'], birthDate: '1995', metadata: {} })
    const google = await config.callbacks.jwt({ token: {}, user: { email: 'x' }, account: { provider: 'google', access_token: 'access', refresh_token: 'refresh', expires_at: Math.floor(Date.now() / 1000) + 3600 } })
    expect(google).toMatchObject({ oauthProvider: 'google', oauthAccessToken: 'access', oauthRefreshToken: 'refresh', user: { metadata: { needsProfileCompletion: false } } })
    const facebook = await config.callbacks.jwt({ token: google, account: { provider: 'facebook', access_token: 'fb' } })
    expect(facebook).toMatchObject({ oauthProvider: 'facebook', oauthAccessToken: 'fb', oauthRefreshToken: undefined })
    const credentials = await config.callbacks.jwt({ token: facebook, account: { provider: 'credentials' } })
    expect(credentials).toMatchObject({ oauthProvider: null, oauthAccessToken: undefined })
  })

  it('met à jour la session du JWT et tolère une hydratation en échec', async () => {
    const updated = await config.callbacks.jwt({ token: { user: { uid: 'old' } }, trigger: 'update', session: { user: { uid: 'new' } } })
    expect(updated.user).toEqual({ uid: 'new' })
    mockFindByEmail.mockRejectedValueOnce(new Error('down'))
    await expect(config.callbacks.jwt({ token: {}, user: { email: 'x' } })).resolves.toMatchObject({ user: { email: 'x' } })
  })

  it('rafraîchit un token Google expirant et conserve ou signale le refresh', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new-access', expires_in: 3600, refresh_token: 'new-refresh' }) })
    const refreshed = await config.callbacks.jwt({ token: { oauthProvider: 'google', oauthRefreshToken: 'refresh', oauthAccessTokenExpiresAt: Date.now() } })
    expect(refreshed).toMatchObject({ oauthAccessToken: 'new-access', oauthRefreshToken: 'new-refresh', oauthTokenRefreshError: null })

    const missing = await config.callbacks.jwt({ token: { oauthProvider: 'google', oauthAccessTokenExpiresAt: Date.now() } })
    expect(missing.oauthTokenRefreshError).toBe('MISSING_REFRESH_TOKEN')
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad', json: async () => ({ error: 'invalid_grant' }) })
    const refused = await config.callbacks.jwt({ token: { oauthProvider: 'google', oauthRefreshToken: 'x', oauthAccessTokenExpiresAt: Date.now() } })
    expect(refused.oauthTokenRefreshError).toBe('invalid_grant')
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const failed = await config.callbacks.jwt({ token: { oauthProvider: 'google', oauthRefreshToken: 'x', oauthAccessTokenExpiresAt: Date.now() } })
    expect(failed.oauthTokenRefreshError).toBe('REFRESH_FAILED')
  })

  it.each([
    [{}, 'none'],
    [{ oauthProvider: 'google', oauthAccessTokenExpiresAt: Date.now() + 100000 }, 'valid'],
    [{ oauthProvider: 'google', oauthAccessTokenExpiresAt: Date.now() - 1 }, 'expired'],
    [{ oauthProvider: 'google', oauthTokenRefreshError: 'failed' }, 'refresh_failed'],
  ])('expose le statut OAuth dans la session', async (token, status) => {
    const session = await config.callbacks.session({ session: { user: {} }, token: { ...token, user: { uid: 'u1' }, oauthRefreshToken: 'r' } })
    expect(session.auth).toMatchObject({ tokenStatus: status, hasRefreshToken: true })
    expect(session.user).toEqual({ uid: 'u1' })
  })
})

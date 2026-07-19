import { waitFor } from '@testing-library/react'

const mockSignInWithCustomToken = jest.fn()
const mockSignOut = jest.fn()

const authState = {
  currentUser: null as { uid: string } | null,
  signOut: (...args: unknown[]) => mockSignOut(...args),
}

jest.mock('@/firebase/auth', () => ({
  auth: authState,
  signInWithCustomToken: (...args: unknown[]) => mockSignInWithCustomToken(...args),
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated', update: jest.fn() }),
}))

import { connectFirebaseClient } from '@/hooks/use-current-user'

describe('connectFirebaseClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    authState.currentUser = null
    mockSignOut.mockResolvedValue(undefined)
    mockSignInWithCustomToken.mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ token: 'custom-token' }),
    }) as jest.Mock
  })

  it('partage une seule génération de token entre les connexions concurrentes', async () => {
    let releaseSignIn: (() => void) | undefined
    mockSignInWithCustomToken.mockImplementation(() => new Promise<void>((resolve) => {
      releaseSignIn = resolve
    }))

    const connections = [
      connectFirebaseClient('owner-1'),
      connectFirebaseClient('owner-1'),
      connectFirebaseClient('owner-1'),
    ]
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(mockSignInWithCustomToken).toHaveBeenCalledTimes(1)
    })
    releaseSignIn?.()
    await Promise.all(connections)
  })

  it('ne redemande pas de token pour le même utilisateur déjà connecté', async () => {
    authState.currentUser = { uid: 'owner-1' }

    await connectFirebaseClient('owner-1')

    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockSignInWithCustomToken).not.toHaveBeenCalled()
  })

  it('déconnecte un autre compte avant de synchroniser la session courante', async () => {
    authState.currentUser = { uid: 'owner-2' }

    await connectFirebaseClient('owner-1')

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/generate-token', expect.objectContaining({
      body: JSON.stringify({ uid: 'owner-1' }),
    }))
    expect(mockSignInWithCustomToken).toHaveBeenCalledWith(authState, 'custom-token')
  })
})

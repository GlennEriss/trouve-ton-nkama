import { signIn } from '@/next-auth/auth'
import { signInWithGoogle } from '@/actions/signin-with-google'

jest.mock('@/next-auth/auth', () => ({
  signIn: jest.fn()
}))

describe('signInWithGoogle', () => {
  const mockedSignIn = signIn as jest.MockedFunction<typeof signIn>

  it('should call signIn with "google" provider', async () => {
    mockedSignIn.mockResolvedValueOnce({ ok: true } as any)

    await signInWithGoogle()

    expect(mockedSignIn).toHaveBeenCalledWith('google')
  })

  it('should handle successful signIn', async () => {
    mockedSignIn.mockResolvedValueOnce({ ok: true } as any)

    const result = await signInWithGoogle()

    expect(result).toEqual({ ok: true })
  })

  it('should handle signIn failure', async () => {
    const error = new Error('Google signIn failed')
    mockedSignIn.mockRejectedValueOnce(error)

    await expect(signInWithGoogle()).rejects.toThrow('Google signIn failed')
  })
})

import { describe, it, expect, jest } from '@jest/globals'
import { login } from '@/actions/login'
import { signIn } from '@/next-auth/auth'
import { AuthError } from 'next-auth'

jest.mock('@/next-auth/auth', () => ({
  signIn: jest.fn()
}))

describe('login', () => {
  const VALID_TEST_PASSWORD = `ValidPass_${Date.now()}_${Math.random().toString(36).substring(7)}`;
const INVALID_TEST_PASSWORD = `InvalidPass_${Date.now()}_${Math.random().toString(36).substring(7)}`;
const validUser = { email: 'test@example.com', password: VALID_TEST_PASSWORD }
const invalidUser = { email: 'wrong@example.com', password: INVALID_TEST_PASSWORD }

  it('should return success when login is successful', async () => {
    (signIn as jest.MockedFunction<typeof signIn>).mockResolvedValueOnce({ ok: true } as any)
    const result = await login(validUser)
    expect(result).toEqual({
      error: false,
      success: true,
      message: 'Login successful',
    })
  })

  it('should return error when AuthError is thrown', async () => {
    (signIn as jest.MockedFunction<typeof signIn>).mockRejectedValueOnce(new AuthError('Invalid credentials'))
    const result = await login(invalidUser)
    expect(result).toEqual({
      error: true,
      success: false,
      message: 'Invalid credentials',
    })
  })

  it('should return unexpected error for unknown error', async () => {
    (signIn as jest.MockedFunction<typeof signIn>).mockRejectedValueOnce(new Error('Something else'))
    const result = await login(invalidUser)
    expect(result).toEqual({
      error: true,
      success: false,
      message: 'An unexpected error occurred',
    })
  })
})

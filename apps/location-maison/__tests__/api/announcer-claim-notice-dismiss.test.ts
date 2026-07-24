import { auth } from '@/next-auth/auth'
import { userRepository } from '@/features/auth/repositories/user.repository'

let dismiss: typeof import('@/app/api/announcer/claim-notice/dismiss/route').POST

jest.mock('next/server', () => ({
  NextResponse: { json: (payload: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => payload }) },
}))
jest.mock('@/next-auth/auth', () => ({ auth: jest.fn() }))
jest.mock('@/features/auth/repositories/user.repository', () => ({
  userRepository: { findById: jest.fn(), update: jest.fn() },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))

describe('POST /api/announcer/claim-notice/dismiss', () => {
  beforeAll(async () => { ({ POST: dismiss } = await import('@/app/api/announcer/claim-notice/dismiss/route')) })
  beforeEach(() => jest.clearAllMocks())

  it('refuse un visiteur anonyme', async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)
    const response = await dismiss()
    expect(response.status).toBe(401)
  })

  it('efface pendingClaimNotice sans toucher au reste des metadata', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'u1' } })
    ;(userRepository.findById as jest.Mock).mockResolvedValue({
      uid: 'u1',
      metadata: { needsProfileCompletion: false, pendingClaimNotice: { count: 2, claimedAt: 'now' } },
    })
    ;(userRepository.update as jest.Mock).mockImplementation(async (_uid: string, data: any) => ({ uid: 'u1', ...data }))

    const response = await dismiss()

    expect(userRepository.update).toHaveBeenCalledWith('u1', { metadata: { needsProfileCompletion: false } })
    expect(response.status).toBe(200)
    expect((await response.json()).success).toBe(true)
  })

  it('traduit un utilisateur introuvable en 404', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'u1' } })
    ;(userRepository.findById as jest.Mock).mockResolvedValue(null)

    const response = await dismiss()
    expect(response.status).toBe(404)
  })

  it('traduit une panne de persistance en 500', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'u1' } })
    ;(userRepository.findById as jest.Mock).mockRejectedValue(new Error('down'))

    const response = await dismiss()
    expect(response.status).toBe(500)
  })
})

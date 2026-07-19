const getMock = jest.fn()
const setMock = jest.fn()
const delMock = jest.fn()
const fallback = {
  get: jest.fn(),
  set: jest.fn(),
  setIfAbsent: jest.fn(),
  del: jest.fn(),
}

jest.mock('@/redis/client', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => getMock(...args),
    set: (...args: unknown[]) => setMock(...args),
    del: (...args: unknown[]) => delMock(...args),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: jest.fn() }),
}))

import { RedisCacheStore } from '@/lib/cache/redis-cache-store'

describe('RedisCacheStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fallback.get.mockResolvedValue(null)
    fallback.set.mockResolvedValue(undefined)
    fallback.setIfAbsent.mockResolvedValue(true)
    fallback.del.mockResolvedValue(undefined)
  })

  it('reserve une cle atomiquement avec NX et une expiration', async () => {
    setMock.mockResolvedValueOnce('OK').mockResolvedValueOnce(null)
    const cache = new RedisCacheStore()

    await expect(cache.setIfAbsent('lot6c', true, 30)).resolves.toBe(true)
    await expect(cache.setIfAbsent('lot6c', true, 30)).resolves.toBe(false)
    expect(setMock).toHaveBeenNthCalledWith(1, 'lot6c', true, { ex: 30, nx: true })
  })

  it('reste best effort quand Redis est indisponible', async () => {
    setMock.mockRejectedValue(new Error('Redis indisponible'))

    await expect(new RedisCacheStore().setIfAbsent('lot6c', true, 30)).resolves.toBe(false)
  })

  it('bascule sur Firestore et ouvre temporairement le circuit Redis', async () => {
    setMock.mockRejectedValue(new Error('Redis rate limited'))
    const cache = new RedisCacheStore(fallback)

    await expect(cache.setIfAbsent('lot6d:first', true, 30)).resolves.toBe(true)
    await expect(cache.setIfAbsent('lot6d:second', true, 30)).resolves.toBe(true)

    expect(setMock).toHaveBeenCalledTimes(1)
    expect(fallback.setIfAbsent).toHaveBeenNthCalledWith(1, 'lot6d:first', true, 30)
    expect(fallback.setIfAbsent).toHaveBeenNthCalledWith(2, 'lot6d:second', true, 30)
  })
})

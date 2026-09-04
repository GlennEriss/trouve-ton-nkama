import { MemoryCacheStore } from '@/lib/cache/memory-cache-store'

describe('MemoryCacheStore', () => {
  it('retourne null pour une cle absente', async () => {
    const cache = new MemoryCacheStore()
    await expect(cache.get('missing')).resolves.toBeNull()
  })

  it('stocke puis relit une valeur avant expiration', async () => {
    const cache = new MemoryCacheStore()
    await cache.set('key', { hello: 'world' }, 60)
    await expect(cache.get('key')).resolves.toEqual({ hello: 'world' })
  })

  it('expire une entree apres son TTL', async () => {
    jest.useFakeTimers().setSystemTime(0)
    const cache = new MemoryCacheStore()
    await cache.set('key', 'value', 10)

    jest.setSystemTime(9_000)
    await expect(cache.get('key')).resolves.toBe('value')

    jest.setSystemTime(10_001)
    await expect(cache.get('key')).resolves.toBeNull()
    jest.useRealTimers()
  })

  it('setIfAbsent ne remplace pas une valeur encore valide', async () => {
    const cache = new MemoryCacheStore()
    await expect(cache.setIfAbsent('lock', 'first', 60)).resolves.toBe(true)
    await expect(cache.setIfAbsent('lock', 'second', 60)).resolves.toBe(false)
    await expect(cache.get('lock')).resolves.toBe('first')
  })

  it('setIfAbsent reussit de nouveau une fois la valeur expiree', async () => {
    jest.useFakeTimers().setSystemTime(0)
    const cache = new MemoryCacheStore()
    await cache.setIfAbsent('lock', 'first', 5)

    jest.setSystemTime(5_001)
    await expect(cache.setIfAbsent('lock', 'second', 5)).resolves.toBe(true)
    await expect(cache.get('lock')).resolves.toBe('second')
    jest.useRealTimers()
  })

  it('del retire une entree', async () => {
    const cache = new MemoryCacheStore()
    await cache.set('key', 'value', 60)
    await cache.del('key')
    await expect(cache.get('key')).resolves.toBeNull()
  })

  it('evince la plus ancienne entree une fois la capacite atteinte', async () => {
    const cache = new MemoryCacheStore(2)
    await cache.set('a', 1, 60)
    await cache.set('b', 2, 60)
    await cache.set('c', 3, 60)

    await expect(cache.get('a')).resolves.toBeNull()
    await expect(cache.get('b')).resolves.toBe(2)
    await expect(cache.get('c')).resolves.toBe(3)
  })
})

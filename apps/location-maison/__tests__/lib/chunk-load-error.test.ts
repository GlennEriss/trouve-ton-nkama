import { isChunkLoadError } from '@/lib/errors/chunk-load-error'

describe('isChunkLoadError', () => {
  it('reconnait une ChunkLoadError par son nom', () => {
    const error = new Error('boom')
    error.name = 'ChunkLoadError'
    expect(isChunkLoadError(error)).toBe(true)
  })

  it('reconnait le message webpack "Loading chunk X failed"', () => {
    expect(isChunkLoadError(new Error('Loading chunk 4821 failed.'))).toBe(true)
  })

  it('reconnait un import dynamique ESM echoue', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/y.js'))).toBe(true)
  })

  it('reconnait la variante Firefox "error loading dynamically imported module"', () => {
    expect(isChunkLoadError(new Error('error loading dynamically imported module: https://x/y.js'))).toBe(true)
  })

  it('ne reconnait pas une erreur applicative normale', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false)
  })

  it('renvoie false pour une valeur qui n est pas une Error', () => {
    expect(isChunkLoadError('just a string')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})

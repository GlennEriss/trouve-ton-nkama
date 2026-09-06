import { renderHook } from '@testing-library/react'
import { useChunkErrorRecovery } from '@/lib/errors/use-chunk-error-recovery'

describe('useChunkErrorRecovery', () => {
  let reloadMock: jest.Mock

  beforeEach(() => {
    window.sessionStorage.clear()
    reloadMock = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    })
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('recharge la page une fois pour une erreur de chunk', () => {
    const error = new Error('Loading chunk 42 failed.')
    renderHook(() => useChunkErrorRecovery(error))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('ne recharge pas deux fois dans la meme session', () => {
    window.sessionStorage.setItem('ttn:error-boundary:reloaded-once', '1')
    const error = new Error('Loading chunk 42 failed.')
    renderHook(() => useChunkErrorRecovery(error))
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('ne recharge pas pour une erreur applicative normale', () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'map')")
    renderHook(() => useChunkErrorRecovery(error))
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('journalise toujours l erreur, meme quand ce n est pas une erreur de chunk', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('autre chose')
    renderHook(() => useChunkErrorRecovery(error))
    expect(consoleSpy).toHaveBeenCalledWith(error)
  })
})

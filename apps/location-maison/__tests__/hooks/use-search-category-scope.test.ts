import { renderHook } from '@testing-library/react'
import { useIsImmobilierSearchScope } from '@/hooks/useSearchCategoryScope'

let currentParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useSearchParams: () => currentParams,
}))

describe('useIsImmobilierSearchScope', () => {
  it('vrai quand aucune categorie n est selectionnee (Toutes categories)', () => {
    currentParams = new URLSearchParams()
    const { result } = renderHook(() => useIsImmobilierSearchScope())
    expect(result.current).toBe(true)
  })

  it('vrai quand la categorie est explicitement Immobilier', () => {
    currentParams = new URLSearchParams('category=Immobilier')
    const { result } = renderHook(() => useIsImmobilierSearchScope())
    expect(result.current).toBe(true)
  })

  it('faux pour toute autre categorie (ex. Mode)', () => {
    currentParams = new URLSearchParams('category=Mode')
    const { result } = renderHook(() => useIsImmobilierSearchScope())
    expect(result.current).toBe(false)
  })
})

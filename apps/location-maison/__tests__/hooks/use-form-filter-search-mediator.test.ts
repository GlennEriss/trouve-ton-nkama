import { renderHook } from '@testing-library/react'
import { useFormFilterSearchMediator } from '@/hooks/useFormFilterSearchMediator'

const push = jest.fn()
const replace = jest.fn()
let currentParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => currentParams,
}))

jest.mock('@/providers/AlgoliaContext', () => ({
  useAlgoliaContext: () => ({
    searchText: '',
    clearFilters: jest.fn(),
    setProvince: jest.fn(),
    setCity: jest.fn(),
    setStreet: jest.fn(),
    setMinPrice: jest.fn(),
    setMaxPrice: jest.fn(),
    setMinArea: jest.fn(),
    setMaxArea: jest.fn(),
    setMinNbrRooms: jest.fn(),
    setMaxNbrRooms: jest.fn(),
    setTypeProperty: jest.fn(),
    setStatus: jest.fn(),
    setTags: jest.fn(),
  }),
}))

describe('useFormFilterSearchMediator', () => {
  const form = { setValue: jest.fn(), reset: jest.fn() } as any

  beforeEach(() => {
    push.mockClear()
    replace.mockClear()
  })

  it("reporte category/categoryId/attr_* de l'URL courante — pas seulement category", () => {
    currentParams = new URLSearchParams({ category: 'Mode', categoryId: 'vetements', attr_taille: 'M,L' })
    const { result } = renderHook(() => useFormFilterSearchMediator(form))

    result.current.onSubmit({ province: 'Estuaire' } as any)

    const url = push.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('category')).toBe('Mode')
    expect(params.get('categoryId')).toBe('vetements')
    expect(params.get('attr_taille')).toBe('M,L')
    expect(params.get('province')).toBe('Estuaire')
  })

  it("n'importe jamais un champ du formulaire immobilier explicitement vidé", () => {
    currentParams = new URLSearchParams({ minPrice: '40000', categoryId: 'vetements' })
    const { result } = renderHook(() => useFormFilterSearchMediator(form))

    // minPrice absent de `data` => le mediator ne l'écrit pas dans les nouveaux params ;
    // il ne doit pas non plus être réimporté depuis l'ancienne URL (bug réel corrigé).
    result.current.onSubmit({ province: 'Estuaire' } as any)

    const url = push.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.has('minPrice')).toBe(false)
    expect(params.get('categoryId')).toBe('vetements')
  })

  it('onClear efface tout, y compris category/attr_* (retour à /search sans params)', () => {
    currentParams = new URLSearchParams({ category: 'Mode', attr_taille: 'M' })
    const { result } = renderHook(() => useFormFilterSearchMediator(form))

    result.current.onClear()

    expect(replace).toHaveBeenCalledWith('/search')
    expect(push).not.toHaveBeenCalled()
  })
})

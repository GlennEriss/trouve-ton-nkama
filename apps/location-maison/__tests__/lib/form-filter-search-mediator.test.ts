import { FormFilterSearchMediator } from '@/mediators/FormFilterSearchMediator'

function createAlgoliaMock() {
  return {
    searchText: 'studio',
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
  } as any
}

describe('FormFilterSearchMediator', () => {
  it('ne produit jamais Infinity quand les bornes sont vides ou inversees', () => {
    const form = { setValue: jest.fn() } as any
    const mediator = new FormFilterSearchMediator(form, createAlgoliaMock())

    const empty = mediator.normalizeValues({})
    const reversed = mediator.normalizeValues({ minPrice: 50000, maxPrice: 40000 })

    expect(empty).toEqual({
      minPrice: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
      minRooms: undefined,
      maxRooms: undefined,
    })
    expect(reversed.maxPrice).toBeUndefined()
    expect(form.setValue).toHaveBeenCalledWith('maxPrice', undefined)
    expect(mediator.buildUrlParams({ minPrice: 50000, maxPrice: 40000 }, reversed).toString())
      .toBe('query=studio&minPrice=50000')
  })

  it('efface aussi les anciennes valeurs du contexte', () => {
    const algolia = createAlgoliaMock()
    const mediator = new FormFilterSearchMediator({ setValue: jest.fn() } as any, algolia)
    const normalized = mediator.normalizeValues({})

    mediator.updateContext({}, normalized)

    expect(algolia.setCity).toHaveBeenCalledWith('')
    expect(algolia.setMaxPrice).toHaveBeenCalledWith('')
    expect(algolia.setTypeProperty).toHaveBeenCalledWith([])
    expect(algolia.setStatus).toHaveBeenCalledWith([])
    expect(algolia.setTags).toHaveBeenCalledWith([])
  })

  it('reinitialise le formulaire et le contexte', () => {
    const form = { reset: jest.fn() } as any
    const algolia = createAlgoliaMock()

    new FormFilterSearchMediator(form, algolia).resetForm()

    expect(form.reset).toHaveBeenCalledWith(expect.objectContaining({
      province: '',
      minPrice: undefined,
      typeProperty: [],
    }))
    expect(algolia.clearFilters).toHaveBeenCalledTimes(1)
  })
})

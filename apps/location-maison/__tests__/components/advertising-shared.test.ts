import {
  calculateClickThroughRate,
  formatClickThroughRate,
} from '@/components/advertising/advertising-shared'

describe('statistiques publicitaires annonceur', () => {
  it('retourne zero sans impression exploitable', () => {
    expect(calculateClickThroughRate(0, 3)).toBe(0)
    expect(calculateClickThroughRate(Number.NaN, 3)).toBe(0)
    expect(formatClickThroughRate(0, 3)).toBe('0 %')
  })

  it('calcule et formate le taux de clic', () => {
    expect(calculateClickThroughRate(80, 10)).toBe(12.5)
    expect(formatClickThroughRate(80, 10)).toBe('12,5 %')
  })
})

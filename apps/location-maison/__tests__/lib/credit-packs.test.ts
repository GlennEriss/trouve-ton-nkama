import {
  ADMIN_PACKS_TEMPLATE,
  estimateCreditsXafValue,
  formatCreditUnitPriceRange,
  formatXaf,
  toUiCreditPack,
  type CreditPackData,
} from '@/lib/credits/credit-packs'

const normalizeSpaces = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ')

describe('credit packs business rules', () => {
  it('formate les montants en FCFA', () => {
    expect(normalizeSpaces(formatXaf(17_500))).toBe('17 500 FCFA')
    expect(formatXaf(250)).toBe('250 FCFA')
  })

  it('estime la valeur FCFA avec le meilleur prix actif par credit', () => {
    expect(estimateCreditsXafValue(70)).toBe(17_500)
    expect(estimateCreditsXafValue(0)).toBe(0)
    expect(estimateCreditsXafValue(-10)).toBe(0)
  })

  it('ignore les packs inactifs ou sans prix dans le calcul', () => {
    const packs: CreditPackData[] = [
      { id: 'inactive', name: 'Inactive', credits: 100, price: 100, isActive: false },
      { id: 'free', name: 'Free', credits: 100, price: 0, isActive: true },
      { id: 'valid', name: 'Valid', credits: 3, price: 900, isActive: true },
    ]

    expect(estimateCreditsXafValue(2, packs)).toBe(600)
  })

  it('utilise les packs admin par defaut si aucun pack valide ne peut etre price', () => {
    const packs: CreditPackData[] = [
      { id: 'inactive', name: 'Inactive', credits: 5, price: 2_000, isActive: false },
    ]

    expect(estimateCreditsXafValue(1, packs)).toBe(250)
  })

  it('affiche la plage de prix par credit selon les packs actifs', () => {
    expect(normalizeSpaces(formatCreditUnitPriceRange(ADMIN_PACKS_TEMPLATE))).toBe(
      '1 crédit ≈ 250 FCFA à 400 FCFA selon le pack',
    )
  })

  it('prepare les metadonnees UI sans changer les donnees metier du pack', () => {
    const standard = toUiCreditPack(ADMIN_PACKS_TEMPLATE.find((pack) => pack.id === 'standard')!)
    const premium = toUiCreditPack(ADMIN_PACKS_TEMPLATE.find((pack) => pack.id === 'premium')!)

    expect(standard.popular).toBe(true)
    expect(standard.bestValue).toBe(false)
    expect(standard.originalPrice).toBe(4_000)
    expect(premium.bestValue).toBe(true)
    expect(premium.popular).toBe(false)
    expect(premium.features).toContain('Support VIP')
  })
})

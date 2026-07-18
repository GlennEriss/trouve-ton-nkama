export interface CreditPackData {
  id: string
  name: string
  credits: number
  price: number
  savings?: number
  isActive?: boolean
  order?: number
}

export interface CreditPackUi extends CreditPackData {
  originalPrice?: number
  popular?: boolean
  bestValue?: boolean
  features?: string[]
}

const PACK_UI_CONFIG: Record<
  string,
  {
    popular?: boolean
    bestValue?: boolean
    features: string[]
  }
> = {
  starter: {
    features: ['Idéal pour tester', 'Support standard'],
  },
  standard: {
    popular: true,
    features: ['Pack le plus choisi', 'Support prioritaire', 'Économique'],
  },
  advanced: {
    features: [
      'Excellent rapport qualité/prix',
      'Support prioritaire',
      'Bonus: conseils personnalisés',
    ],
  },
  premium: {
    bestValue: true,
    features: [
      'Meilleure économie',
      'Support VIP',
      'Conseils dédiés',
      'Accès prioritaire aux nouveautés',
    ],
  },
}

export const ADMIN_PACKS_TEMPLATE: CreditPackData[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 2000,
    order: 1,
    isActive: true,
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 10,
    price: 3500,
    savings: 12.5,
    order: 2,
    isActive: true,
  },
  {
    id: 'advanced',
    name: 'Avancé',
    credits: 25,
    price: 7500,
    savings: 25,
    order: 3,
    isActive: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    credits: 50,
    price: 12500,
    savings: 37.5,
    order: 4,
    isActive: true,
  },
]

function getPricedPacks(packs: ReadonlyArray<CreditPackData>) {
  const active = packs.filter((pack) => pack.isActive !== false && pack.credits > 0 && pack.price > 0)
  return active.length > 0 ? active : ADMIN_PACKS_TEMPLATE
}

export function formatXaf(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`
}

export function estimateCreditsXafValue(
  credits: number,
  packs: ReadonlyArray<CreditPackData> = ADMIN_PACKS_TEMPLATE,
): number {
  const pricedPacks = getPricedPacks(packs)
  const bestUnitPrice = Math.min(...pricedPacks.map((pack) => pack.price / pack.credits))
  return Math.round(Math.max(0, credits) * bestUnitPrice)
}

export function formatCreditUnitPriceRange(
  packs: ReadonlyArray<CreditPackData> = ADMIN_PACKS_TEMPLATE,
): string {
  const pricedPacks = getPricedPacks(packs)
  const unitPrices = pricedPacks.map((pack) => pack.price / pack.credits)
  const min = Math.round(Math.min(...unitPrices))
  const max = Math.round(Math.max(...unitPrices))

  if (min === max) return `1 crédit ≈ ${formatXaf(min)}`

  return `1 crédit ≈ ${formatXaf(min)} à ${formatXaf(max)} selon le pack`
}

export function toUiCreditPack(pack: CreditPackData): CreditPackUi {
  const normalizedId = pack.id.trim().toLowerCase()
  const uiConfig = PACK_UI_CONFIG[normalizedId]

  const savings =
    typeof pack.savings === 'number' && Number.isFinite(pack.savings)
      ? pack.savings
      : undefined

  const originalPrice =
    savings && savings > 0 && savings < 100
      ? Math.round(pack.price / (1 - savings / 100))
      : undefined

  return {
    ...pack,
    savings,
    originalPrice,
    popular: uiConfig?.popular ?? false,
    bestValue: uiConfig?.bestValue ?? false,
    features: uiConfig?.features ?? [],
  }
}

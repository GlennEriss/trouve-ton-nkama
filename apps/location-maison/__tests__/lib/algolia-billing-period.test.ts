import {
  billingAnchorDay,
  billingPeriodKey,
  billingPeriodRange,
  isPeriodStale,
  softLimit,
  alertThreshold,
  monthlyQuota,
} from '@/lib/search/algolia-billing-period'

const d = (iso: string) => new Date(iso)

describe('billingPeriodKey (ancre = 9, cycle Algolia du 9 au 8)', () => {
  it('classe une date à partir du 9 dans la période du mois courant', () => {
    expect(billingPeriodKey(d('2026-09-09T00:00:00Z'))).toBe('2026-09')
    expect(billingPeriodKey(d('2026-09-30T23:00:00Z'))).toBe('2026-09')
  })

  it('classe une date avant le 9 dans la période du mois précédent', () => {
    expect(billingPeriodKey(d('2026-09-08T23:59:59Z'))).toBe('2026-08')
  })

  it('gère le passage d\'année dans les deux sens', () => {
    expect(billingPeriodKey(d('2027-01-03T00:00:00Z'))).toBe('2026-12')
    expect(billingPeriodKey(d('2027-01-09T00:00:00Z'))).toBe('2027-01')
  })
})

describe('billingPeriodRange', () => {
  it('borne la période du 9 (inclus) au 9 suivant (exclu)', () => {
    const r = billingPeriodRange('2026-09')
    expect(r.start.toISOString()).toBe('2026-09-09T00:00:00.000Z')
    expect(r.end.toISOString()).toBe('2026-10-09T00:00:00.000Z')
    expect(r.label).toBe('09/09/2026 → 08/10/2026')
  })
})

describe('isPeriodStale', () => {
  it('vrai si absent ou différent de la période courante', () => {
    expect(isPeriodStale(null, d('2026-09-20T00:00:00Z'))).toBe(true)
    expect(isPeriodStale('2026-08', d('2026-09-20T00:00:00Z'))).toBe(true)
  })
  it('faux si égal à la période courante', () => {
    expect(isPeriodStale('2026-09', d('2026-09-20T00:00:00Z'))).toBe(false)
  })
})

describe('seuils configurables', () => {
  const OLD = { ...process.env }
  afterEach(() => {
    process.env = { ...OLD }
  })

  it('valeurs par défaut : quota 10000, bascule 9000, alerte 8000, ancre 9', () => {
    delete process.env.ALGOLIA_MONTHLY_QUOTA
    delete process.env.ALGOLIA_QUOTA_SOFT_LIMIT
    delete process.env.ALGOLIA_QUOTA_ALERT_AT
    delete process.env.ALGOLIA_BILLING_ANCHOR_DAY
    expect(monthlyQuota()).toBe(10_000)
    expect(softLimit()).toBe(9_000)
    expect(alertThreshold()).toBe(8_000)
    expect(billingAnchorDay()).toBe(9)
  })

  it('respecte les surcharges d\'environnement', () => {
    process.env.ALGOLIA_MONTHLY_QUOTA = '20000'
    process.env.ALGOLIA_QUOTA_SOFT_LIMIT = '15000'
    process.env.ALGOLIA_BILLING_ANCHOR_DAY = '15'
    expect(monthlyQuota()).toBe(20_000)
    expect(softLimit()).toBe(15_000)
    expect(billingAnchorDay()).toBe(15)
    expect(billingPeriodKey(d('2026-09-10T00:00:00Z'))).toBe('2026-08')
  })
})

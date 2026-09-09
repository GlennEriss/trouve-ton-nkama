import {
  billingPeriodKey,
  billingPeriodRange,
  isPeriodStale,
} from '../src/search/algolia-billing-period';

const d = (iso: string) => new Date(iso);

describe('billingPeriodKey (ancre = 9)', () => {
  it('classe une date après le 9 dans la période du mois courant', () => {
    expect(billingPeriodKey(d('2026-09-20T12:00:00Z'))).toBe('2026-09');
    expect(billingPeriodKey(d('2026-09-09T00:00:00Z'))).toBe('2026-09');
  });

  it('classe une date avant le 9 dans la période du mois précédent', () => {
    expect(billingPeriodKey(d('2026-09-08T23:59:59Z'))).toBe('2026-08');
    expect(billingPeriodKey(d('2026-09-01T00:00:00Z'))).toBe('2026-08');
  });

  it('gère le passage d\'année', () => {
    expect(billingPeriodKey(d('2027-01-03T00:00:00Z'))).toBe('2026-12');
    expect(billingPeriodKey(d('2027-01-09T00:00:00Z'))).toBe('2027-01');
  });
});

describe('billingPeriodRange', () => {
  it('borne la période du 9 au 8 du mois suivant', () => {
    const r = billingPeriodRange('2026-09');
    expect(r.start.toISOString()).toBe('2026-09-09T00:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-09T00:00:00.000Z');
    expect(r.label).toBe('09/09/2026 → 08/10/2026');
  });
});

describe('isPeriodStale', () => {
  it('vrai quand la clé ne correspond pas à la période courante', () => {
    expect(isPeriodStale('2026-08', d('2026-09-20T00:00:00Z'))).toBe(true);
    expect(isPeriodStale(undefined, d('2026-09-20T00:00:00Z'))).toBe(true);
  });
  it('faux quand la clé correspond', () => {
    expect(isPeriodStale('2026-09', d('2026-09-20T00:00:00Z'))).toBe(false);
  });
});

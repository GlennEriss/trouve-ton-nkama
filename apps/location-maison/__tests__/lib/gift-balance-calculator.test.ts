import { computeGiftBalanceFromRows } from '@/lib/gifts/balance-calculator'

describe('gift balance calculator', () => {
  it('deduit les retraits en attente et traites du disponible', () => {
    expect(
      computeGiftBalanceFromRows(10_000, [
        { montantXaf: 2_000, statut: 'EN_ATTENTE' },
        { montantXaf: 1_500, statut: 'TRAITE' },
      ]),
    ).toEqual({
      totalRecuXaf: 10_000,
      disponibleXaf: 6_500,
      totalRetireXaf: 1_500,
      hasPendingWithdrawal: true,
    })
  })

  it('ignore les retraits refuses', () => {
    expect(
      computeGiftBalanceFromRows(5_000, [
        { montantXaf: 4_000, statut: 'REFUSE' },
      ]),
    ).toEqual({
      totalRecuXaf: 5_000,
      disponibleXaf: 5_000,
      totalRetireXaf: 0,
      hasPendingWithdrawal: false,
    })
  })

  it('normalise les montants invalides et bloque un solde negatif', () => {
    expect(
      computeGiftBalanceFromRows('1000.9', [
        { montantXaf: '5000.9', statut: 'TRAITE' },
        { montantXaf: -100, statut: 'EN_ATTENTE' },
      ]),
    ).toEqual({
      totalRecuXaf: 1_000,
      disponibleXaf: 0,
      totalRetireXaf: 5_000,
      hasPendingWithdrawal: true,
    })
  })
})

export interface GiftBalance {
  totalRecuXaf: number
  disponibleXaf: number
  totalRetireXaf: number
  hasPendingWithdrawal: boolean
}

export interface GiftWithdrawalBalanceRow {
  montantXaf?: unknown
  statut?: unknown
}

function toPositiveInteger(value: unknown): number {
  return Math.max(0, Math.trunc(Number(value ?? 0)))
}

export function computeGiftBalanceFromRows(
  totalReceivedXaf: unknown,
  withdrawals: ReadonlyArray<GiftWithdrawalBalanceRow>,
): GiftBalance {
  const totalRecuXaf = toPositiveInteger(totalReceivedXaf)
  let debitedXaf = 0
  let totalRetireXaf = 0
  let hasPendingWithdrawal = false

  for (const withdrawal of withdrawals) {
    const montant = toPositiveInteger(withdrawal.montantXaf)
    if (withdrawal.statut === 'REFUSE') continue

    debitedXaf += montant
    if (withdrawal.statut === 'TRAITE') totalRetireXaf += montant
    if (withdrawal.statut === 'EN_ATTENTE') hasPendingWithdrawal = true
  }

  return {
    totalRecuXaf,
    disponibleXaf: Math.max(0, totalRecuXaf - debitedXaf),
    totalRetireXaf,
    hasPendingWithdrawal,
  }
}

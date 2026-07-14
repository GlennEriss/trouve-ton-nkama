// Paramètres économiques des cadeaux (dons MoMo sur les réels).
// Taux validés produit : commission plateforme 15 % prélevée à la confirmation
// du paiement — l'annonceur ne voit et ne retire que le montant net.

export const GIFT_COMMISSION_RATE = 0.15

export const GIFT_MIN_AMOUNT_XAF = 500
export const GIFT_MAX_AMOUNT_XAF = 100_000

// Anti-spam : nombre max de transactions cadeau `pending` initiables par
// numéro de téléphone donateur sur une fenêtre glissante d'une heure.
export const GIFT_MAX_PENDING_PER_PHONE_PER_HOUR = 5

export const GIFT_MESSAGE_MAX_LENGTH = 200

/** Montant net crédité à l'annonceur après commission plateforme. */
export function computeNetAmount(amountXaf: number): number {
  return Math.floor(amountXaf * (1 - GIFT_COMMISSION_RATE))
}

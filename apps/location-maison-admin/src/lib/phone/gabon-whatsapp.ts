/**
 * Numéros mobile Gabon : saisis localement avec un 0 en tête (ex: "062459646"), l'indicatif
 * international remplace ce 0 par "241" (pas un simple préfixe) — "062459646" -> "+24162459646".
 * Demande explicite de l'utilisateur pour les demandes de recherche (whatsappContact).
 * Dupliqué depuis apps/location-maison/src/lib/phone/gabon-whatsapp.ts et
 * functions/src/payments/mypayga/config.ts (toGabonE164) — apps indépendantes, pas de
 * package partagé pour une poignée de lignes pures, même convention déjà en place ailleurs
 * dans ce module (TYPE_PROPERTY_LABELS de search-request-facebook.policy.ts).
 */
export function toGabonWhatsappE164(raw: string): string {
  const digits = String(raw ?? '').replace(/[^\d]/g, '')
  if (!digits) return String(raw ?? '').trim()

  if (digits.startsWith('241') && digits.length >= 11) {
    return `+${digits}`
  }
  if (digits.length === 9 && digits.startsWith('0')) {
    return `+241${digits.slice(1)}`
  }
  return String(raw ?? '').trim()
}

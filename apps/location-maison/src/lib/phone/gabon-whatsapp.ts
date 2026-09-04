/**
 * Numéros mobile Gabon : saisis localement avec un 0 en tête (ex: "062459646"), l'indicatif
 * international remplace ce 0 par "241" (pas un simple préfixe) — "062459646" -> "+24162459646".
 * Demande explicite de l'utilisateur pour les demandes de recherche (whatsappContact),
 * mais la logique est générique à tout numéro mobile gabonais.
 */

function onlyDigits(raw: unknown): string {
  return String(raw ?? '').replace(/[^\d]/g, '')
}

/**
 * Forme d'affichage/stockage canonique : "+241" + les 8 chiffres locaux, sans le 0 initial.
 * Idempotent (un numéro déjà au format +241... ressort inchangé) et défensif : un numéro qui
 * ne ressemble ni à un local gabonais (9 chiffres, 0 en tête) ni à un international déjà
 * préfixé 241 est renvoyé tel quel plutôt que mal transformé (numéro étranger, saisie déjà
 * correcte dans un autre format...).
 */
export function toGabonWhatsappE164(raw: string): string {
  const digits = onlyDigits(raw)
  if (!digits) return String(raw ?? '').trim()

  if (digits.startsWith('241') && digits.length >= 11) {
    return `+${digits}`
  }
  if (digits.length === 9 && digits.startsWith('0')) {
    return `+241${digits.slice(1)}`
  }
  return String(raw ?? '').trim()
}

/**
 * Forme attendue par un lien wa.me (chiffres seuls, sans "+") — accepte indifféremment
 * l'ancien format stocké localement ("062459646") ou le nouveau format E.164
 * ("+24162459646"/"24162459646"), pour que le lien fonctionne quelle que soit la donnée déjà
 * en base (pas de migration requise pour que les demandes existantes redeviennent cliquables).
 */
export function toWaMeDigits(raw: string): string {
  const digits = onlyDigits(raw)
  if (digits.length === 9 && digits.startsWith('0')) {
    return `241${digits.slice(1)}`
  }
  return digits
}

// Miroir de apps/location-maison/src/lib/phone/gabon-whatsapp.ts — même convention
// dupliquée délibérément plutôt que partagée (voir la note équivalente sur functions/ dans
// ce même monorepo : peu de lignes pures, pas la peine d'un package partagé pour ça).
function onlyDigits(raw: unknown): string {
  return String(raw ?? '').replace(/[^\d]/g, '');
}

export function toGabonWhatsappE164(raw: string): string {
  const digits = onlyDigits(raw);
  if (!digits) return String(raw ?? '').trim();
  if (digits.startsWith('241') && digits.length >= 11) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith('0')) return `+241${digits.slice(1)}`;
  return String(raw ?? '').trim();
}

export function toWaMeDigits(raw: string): string {
  const digits = onlyDigits(raw);
  if (digits.length === 9 && digits.startsWith('0')) return `241${digits.slice(1)}`;
  return digits;
}

// Miroir de SUPPORTED_COUNTRIES.GA (apps/location-maison/src/lib/phoneValidation.ts) — mêmes
// motifs (nouvelle numérotation 2024, préfixes 6/7, + ancienne pour compatibilité), Gabon
// uniquement (l'app entière est Gabon-only, contrairement au web qui active aussi le Sénégal
// en dev pour les tests OTP).
const GA_PHONE_PATTERNS = [
  /^\+241[67]\d{7}$/,
  /^241[67]\d{7}$/,
  /^0[67]\d{7}$/,
  /^[67]\d{7}$/,
  /^\+2410[1-9]\d{6}$/,
  /^2410[1-9]\d{6}$/,
  /^00[1-9]\d{6}$/,
  /^0[1-9]\d{6}$/,
];

export function isValidGabonPhone(raw: string): boolean {
  const value = String(raw ?? '').trim();
  return GA_PHONE_PATTERNS.some((pattern) => pattern.test(value));
}

// Comme toGabonWhatsappE164, mais gère aussi le numéro local SANS le 0 initial (8 chiffres,
// convention du champ "Numéro d'appel" web — placeholder "Ex: 66 12 34 56 (sans 0)", voir
// PhoneNumberFormApp/SignupMobileComponent.tsx) — cas que toGabonWhatsappE164 ne couvrait pas
// (il retournait la valeur brute inchangée). N'appelle isValidGabonPhone qu'en amont ; ne
// revalide pas ici.
export function toGabonE164(raw: string): string {
  const digits = onlyDigits(raw);
  if (!digits) return String(raw ?? '').trim();
  if (digits.startsWith('241')) return `+${digits}`;
  if (digits.startsWith('0')) return `+241${digits.slice(1)}`;
  return `+241${digits}`;
}

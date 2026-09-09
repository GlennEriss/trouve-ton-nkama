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

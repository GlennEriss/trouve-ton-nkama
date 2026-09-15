// Miroir de DateSelect.tsx + dateUtils.ts (web, getDaysInMonth) : mêmes options, même
// comportement (jours dynamiques selon le mois/année choisis, 29 pour février bissextile,
// 100 ans en arrière pour l'année) — voir [[feedback-mobile-reuse-pwa-design]].
export type DateOption = { label: string; value: string };

export const MONTH_OPTIONS: DateOption[] = [
  { label: 'Janvier', value: '01' },
  { label: 'Février', value: '02' },
  { label: 'Mars', value: '03' },
  { label: 'Avril', value: '04' },
  { label: 'Mai', value: '05' },
  { label: 'Juin', value: '06' },
  { label: 'Juillet', value: '07' },
  { label: 'Août', value: '08' },
  { label: 'Septembre', value: '09' },
  { label: 'Octobre', value: '10' },
  { label: 'Novembre', value: '11' },
  { label: 'Décembre', value: '12' },
];

export function getYearOptions(): DateOption[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 100 }, (_, i) => {
    const year = currentYear - i;
    return { label: String(year), value: String(year) };
  });
}

export function getDaysInMonth(month: string, year: string): number {
  const monthNum = Number.parseInt(month, 10);
  const yearNum = Number.parseInt(year, 10);
  if (!monthNum || !yearNum) return 31;

  if (monthNum === 2) {
    const isLeapYear = (yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0;
    return isLeapYear ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(monthNum)) return 30;
  return 31;
}

export function getDayOptions(month: string, year: string): DateOption[] {
  const days = getDaysInMonth(month, year);
  return Array.from({ length: days }, (_, i) => {
    const value = String(i + 1).padStart(2, '0');
    return { label: value, value };
  });
}

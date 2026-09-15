import { MONTH_OPTIONS, getYearOptions, getDaysInMonth, getDayOptions } from '../dateOptions';

describe('MONTH_OPTIONS', () => {
  it('a 12 mois nommés avec des valeurs "01".."12"', () => {
    expect(MONTH_OPTIONS).toHaveLength(12);
    expect(MONTH_OPTIONS[0]).toEqual({ label: 'Janvier', value: '01' });
    expect(MONTH_OPTIONS[11]).toEqual({ label: 'Décembre', value: '12' });
  });
});

describe('getYearOptions', () => {
  it('retourne 100 années en partant de l\'année en cours', () => {
    const options = getYearOptions();
    const currentYear = new Date().getFullYear();
    expect(options).toHaveLength(100);
    expect(options[0].value).toBe(String(currentYear));
    expect(options[99].value).toBe(String(currentYear - 99));
  });
});

describe('getDaysInMonth', () => {
  it('retourne 31 par défaut si mois ou année manquant', () => {
    expect(getDaysInMonth('', '')).toBe(31);
    expect(getDaysInMonth('02', '')).toBe(31);
  });

  it('gère les années bissextiles pour février', () => {
    expect(getDaysInMonth('02', '2024')).toBe(29);
    expect(getDaysInMonth('02', '2023')).toBe(28);
    expect(getDaysInMonth('02', '1900')).toBe(28); // divisible par 100, pas par 400
    expect(getDaysInMonth('02', '2000')).toBe(29); // divisible par 400
  });

  it('retourne 30 pour avril, juin, septembre, novembre', () => {
    expect(getDaysInMonth('04', '2024')).toBe(30);
    expect(getDaysInMonth('06', '2024')).toBe(30);
    expect(getDaysInMonth('09', '2024')).toBe(30);
    expect(getDaysInMonth('11', '2024')).toBe(30);
  });

  it('retourne 31 pour les autres mois', () => {
    expect(getDaysInMonth('01', '2024')).toBe(31);
    expect(getDaysInMonth('12', '2024')).toBe(31);
  });
});

describe('getDayOptions', () => {
  it('génère des options "01".."29" pour février bissextile', () => {
    const options = getDayOptions('02', '2024');
    expect(options).toHaveLength(29);
    expect(options[0]).toEqual({ label: '01', value: '01' });
    expect(options[28]).toEqual({ label: '29', value: '29' });
  });
});

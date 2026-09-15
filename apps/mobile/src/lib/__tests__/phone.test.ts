import { toGabonWhatsappE164, toWaMeDigits, isValidGabonPhone, toGabonE164 } from '../phone';

describe('toGabonWhatsappE164', () => {
  it('convertit un numéro local à 9 chiffres commençant par 0', () => {
    expect(toGabonWhatsappE164('074123456')).toBe('+24174123456');
  });

  it('conserve un numéro déjà au format international', () => {
    expect(toGabonWhatsappE164('+24174123456')).toBe('+24174123456');
  });

  it('accepte un numéro international sans le +', () => {
    expect(toGabonWhatsappE164('24174123456')).toBe('+24174123456');
  });

  it('retourne la valeur brute nettoyée si le format est méconnaissable', () => {
    expect(toGabonWhatsappE164('abc')).toBe('abc');
  });
});

describe('toWaMeDigits', () => {
  it('convertit un numéro local à 9 chiffres en digits internationaux sans +', () => {
    expect(toWaMeDigits('074123456')).toBe('24174123456');
  });

  it('laisse les autres formats tels quels (digits uniquement)', () => {
    expect(toWaMeDigits('+24174123456')).toBe('24174123456');
  });
});

// Miroir de SUPPORTED_COUNTRIES.GA (web, phoneValidation.ts) — voir isValidGabonPhone/
// toGabonE164 dans phone.ts.
describe('isValidGabonPhone', () => {
  it('accepte un numéro local à 9 chiffres (nouvelle numérotation, préfixe 0[67])', () => {
    expect(isValidGabonPhone('074123456')).toBe(true);
    expect(isValidGabonPhone('066123456')).toBe(true);
  });

  it("accepte un numéro sans le 0 initial (convention du champ web, 'sans 0')", () => {
    expect(isValidGabonPhone('74123456')).toBe(true);
    expect(isValidGabonPhone('66123456')).toBe(true);
  });

  it('accepte un numéro déjà au format international avec ou sans +', () => {
    expect(isValidGabonPhone('+24174123456')).toBe(true);
    expect(isValidGabonPhone('24174123456')).toBe(true);
  });

  it("rejette un préfixe qui n'est ni 6 ni 7 (nouvelle numérotation)", () => {
    expect(isValidGabonPhone('84123456')).toBe(false);
  });

  it('rejette une chaîne trop courte, trop longue, ou non numérique', () => {
    expect(isValidGabonPhone('123')).toBe(false);
    expect(isValidGabonPhone('0741234567890')).toBe(false);
    expect(isValidGabonPhone('abc')).toBe(false);
    expect(isValidGabonPhone('')).toBe(false);
  });
});

describe('toGabonE164', () => {
  it('convertit un numéro local à 9 chiffres commençant par 0', () => {
    expect(toGabonE164('074123456')).toBe('+24174123456');
  });

  it("convertit un numéro local à 8 chiffres sans le 0 initial (contrairement à toGabonWhatsappE164)", () => {
    expect(toGabonE164('74123456')).toBe('+24174123456');
  });

  it('conserve un numéro déjà au format international', () => {
    expect(toGabonE164('+24174123456')).toBe('+24174123456');
  });

  it('accepte un numéro international sans le +', () => {
    expect(toGabonE164('24174123456')).toBe('+24174123456');
  });
});

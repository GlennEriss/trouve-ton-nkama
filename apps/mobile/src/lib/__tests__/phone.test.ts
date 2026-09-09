import { toGabonWhatsappE164, toWaMeDigits } from '../phone';

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

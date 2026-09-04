import { toGabonWhatsappE164, toWaMeDigits } from '@/lib/phone/gabon-whatsapp'

describe('toGabonWhatsappE164', () => {
  it('remplace le 0 initial par +241 (demande explicite de l\'utilisateur)', () => {
    expect(toGabonWhatsappE164('062459646')).toBe('+24162459646')
  })

  it('est idempotent — un numéro déjà au format +241 ressort inchangé', () => {
    expect(toGabonWhatsappE164('+24162459646')).toBe('+24162459646')
  })

  it('accepte un 241 déjà présent sans le +', () => {
    expect(toGabonWhatsappE164('24162459646')).toBe('+24162459646')
  })

  it('tolère espaces et tirets dans la saisie', () => {
    expect(toGabonWhatsappE164('06 24 59 64 6')).toBe('+24162459646')
    expect(toGabonWhatsappE164('062-45-96-46')).toBe('+24162459646')
  })

  it('ne transforme pas un format non reconnu (ex: numéro étranger)', () => {
    expect(toGabonWhatsappE164('+33612345678')).toBe('+33612345678')
  })
})

describe('toWaMeDigits', () => {
  it('produit des chiffres seuls, sans "+", exploitables par un lien wa.me', () => {
    expect(toWaMeDigits('+24162459646')).toBe('24162459646')
  })

  it('fonctionne aussi sur l\'ancien format stocké localement (pas de migration requise)', () => {
    expect(toWaMeDigits('062459646')).toBe('24162459646')
  })
})

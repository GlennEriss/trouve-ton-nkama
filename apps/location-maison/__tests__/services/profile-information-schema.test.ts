import { ProfileInformationSchema } from '@/features/users/profile-management/ui/v1/profile-information.schema'

// Bug prod corrigé : `email: z.string().email()` (sans `.optional()`) rejette TOUJOURS une
// chaîne vide — pour un compte inscrit par téléphone (email `''`), le formulaire entier
// échouait silencieusement à la validation zod, pas seulement le champ email : impossible de
// changer son pays, son pseudo ou même son numéro de téléphone. Vérifié empiriquement avant
// correctif (`z.string().email().safeParse('').success === false`).
const validBase = {
  firstname: 'Glenn',
  lastname: 'Eriss',
  pseudo: '',
  birthDate: '1995-06-15',
  phoneNumber: '+24174112233',
  countryCode: 'GA',
  socialProfiles: {
    facebook: { url: '', handle: '' },
    instagram: { url: '', handle: '' },
    tiktok: { url: '', handle: '' },
    linkedin: { url: '', handle: '' },
    x: { url: '', handle: '' },
  },
}

describe('ProfileInformationSchema — champ email', () => {
  it('accepte une chaîne vide (compte inscrit par téléphone, sans email) — le formulaire entier reste soumissible', () => {
    const result = ProfileInformationSchema.safeParse({ ...validBase, email: '' })
    expect(result.success).toBe(true)
  })

  it('accepte un email valide', () => {
    const result = ProfileInformationSchema.safeParse({ ...validBase, email: 'glenn@example.com' })
    expect(result.success).toBe(true)
  })

  it('refuse un format invalide non vide', () => {
    const result = ProfileInformationSchema.safeParse({ ...validBase, email: 'pas-un-email' })
    expect(result.success).toBe(false)
  })
})

import {
  buildCategoryListingDraftPrompt,
  CategoryListingDraftError,
  parseCategoryListingDraftResponse,
} from '@/services/ai-category-listing.service'
import type { PublishableCategoryLeaf } from '@/app/api/categories/publishable-leaves/route'

const vetements: PublishableCategoryLeaf = {
  id: 'vetements',
  slug: 'vetements',
  name: 'Vêtements',
  rootId: 'mode',
  rootName: 'Mode',
  locationPrecision: 'city',
  attributeSchema: [
    { key: 'taille', label: 'Taille', type: 'enum', options: ['S', 'M', 'L'], required: true },
    { key: 'marque', label: 'Marque', type: 'text', required: false },
    { key: 'prixNeuf', label: 'Prix neuf', type: 'number', required: false },
    { key: 'occasion', label: "D'occasion", type: 'boolean', required: false },
  ],
}

const accessoires: PublishableCategoryLeaf = {
  id: 'accessoires',
  slug: 'accessoires',
  name: 'Accessoires',
  rootId: 'mode',
  rootName: 'Mode',
  locationPrecision: 'city',
  attributeSchema: [],
}

describe('buildCategoryListingDraftPrompt', () => {
  it('inclut la description utilisateur et un champ enum avec ses options', () => {
    const prompt = buildCategoryListingDraftPrompt('Robe wax taille M', [vetements])

    expect(prompt).toContain('Robe wax taille M')
    expect(prompt).toContain('id "vetements" — Mode > Vêtements')
    expect(prompt).toContain('"taille" (Taille) : une valeur EXACTE parmi ["S", "M", "L"]')
    expect(prompt).toContain('"marque" (Marque) : texte court')
    expect(prompt).toContain('"prixNeuf" (Prix neuf) : nombre')
    expect(prompt).toContain('"occasion" (D\'occasion) : true/false')
  })

  it('affiche "(aucun)" quand une catégorie n\'a pas d\'attributeSchema', () => {
    const prompt = buildCategoryListingDraftPrompt('Sac à main', [accessoires])
    expect(prompt).toContain('id "accessoires" — Mode > Accessoires')
    expect(prompt).toContain('(aucun)')
  })

  it('liste plusieurs catégories séparées par des sauts de ligne', () => {
    const prompt = buildCategoryListingDraftPrompt('Un article', [vetements, accessoires])
    expect(prompt.indexOf('id "vetements"')).toBeLessThan(prompt.indexOf('id "accessoires"'))
  })
})

describe('parseCategoryListingDraftResponse', () => {
  const categories = [vetements, accessoires]

  it('parse une réponse JSON propre avec attributs valides', () => {
    const raw = JSON.stringify({
      categoryId: 'vetements',
      title: 'Robe wax élégante',
      description: 'Robe portée deux fois.',
      price: 18000,
      city: 'Libreville',
      attributes: { taille: 'M', marque: 'Tissage Wax', prixNeuf: 25000, occasion: true },
    })

    const draft = parseCategoryListingDraftResponse(raw, categories)

    expect(draft).toEqual({
      categoryId: 'vetements',
      title: 'Robe wax élégante',
      description: 'Robe portée deux fois.',
      price: 18000,
      city: 'Libreville',
      attributes: { taille: 'M', marque: 'Tissage Wax', prixNeuf: 25000, occasion: true },
    })
  })

  it('retire les fences ```json et le texte autour du JSON', () => {
    const raw = 'Voici le résultat :\n```json\n' + JSON.stringify({
      categoryId: 'accessoires',
      title: 'Sac',
      description: 'Sac en cuir',
      price: 5000,
      city: null,
      attributes: {},
    }) + '\n```\nMerci !'

    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.categoryId).toBe('accessoires')
    expect(draft.title).toBe('Sac')
  })

  it("lève CategoryListingDraftError quand la categoryId ne correspond à aucune catégorie", () => {
    const raw = JSON.stringify({ categoryId: 'inconnue', title: 'x', description: 'y' })
    expect(() => parseCategoryListingDraftResponse(raw, categories)).toThrow(CategoryListingDraftError)
  })

  it("lève CategoryListingDraftError quand categoryId est absent (null)", () => {
    const raw = JSON.stringify({ categoryId: null, title: 'x', description: 'y' })
    expect(() => parseCategoryListingDraftResponse(raw, categories)).toThrow(CategoryListingDraftError)
  })

  it('ignore un attribut enum dont la valeur ne fait pas partie des options', () => {
    const raw = JSON.stringify({
      categoryId: 'vetements',
      title: 't',
      description: 'd',
      attributes: { taille: 'XXL-inconnu', marque: 'Zara' },
    })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.attributes).toEqual({ marque: 'Zara' })
  })

  it('ignore un attribut absent du schéma de la catégorie détectée', () => {
    const raw = JSON.stringify({
      categoryId: 'vetements',
      title: 't',
      description: 'd',
      attributes: { champInconnu: 'valeur', marque: 'Nike' },
    })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.attributes).toEqual({ marque: 'Nike' })
  })

  it('ignore les attributs null, undefined ou chaîne vide', () => {
    const raw = JSON.stringify({
      categoryId: 'vetements',
      title: 't',
      description: 'd',
      attributes: { taille: null, marque: '', prixNeuf: undefined },
    })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.attributes).toEqual({})
  })

  it('convertit un attribut number fourni sous forme de chaîne avec suffixe FCFA', () => {
    const raw = JSON.stringify({
      categoryId: 'vetements',
      title: 't',
      description: 'd',
      attributes: { prixNeuf: '25 000 FCFA' },
    })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.attributes.prixNeuf).toBe(25000)
  })

  it('ignore un attribut number non convertible', () => {
    const raw = JSON.stringify({
      categoryId: 'vetements',
      title: 't',
      description: 'd',
      attributes: { prixNeuf: 'gratuit' },
    })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.attributes).toEqual({})
  })

  it('ignore un attribut boolean dont la valeur n\'est pas un booléen', () => {
    const raw = JSON.stringify({
      categoryId: 'vetements',
      title: 't',
      description: 'd',
      attributes: { occasion: 'oui' },
    })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.attributes).toEqual({})
  })

  it('ignore le bloc attributes quand ce n\'est pas un objet (ex: un tableau)', () => {
    const raw = JSON.stringify({ categoryId: 'vetements', title: 't', description: 'd', attributes: ['x'] })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.attributes).toEqual({})
  })

  it('convertit un prix en chaîne avec virgule de milliers', () => {
    const raw = JSON.stringify({ categoryId: 'accessoires', title: 't', description: 'd', price: '15,000' })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.price).toBe(15000)
  })

  it('renvoie price null quand le prix est zéro, négatif ou non numérique', () => {
    for (const price of [0, -100, 'gratuit', null, undefined]) {
      const raw = JSON.stringify({ categoryId: 'accessoires', title: 't', description: 'd', price })
      const draft = parseCategoryListingDraftResponse(raw, categories)
      expect(draft.price).toBeNull()
    }
  })

  it('renvoie city null quand absente ou vide, sinon trim', () => {
    const raw = JSON.stringify({ categoryId: 'accessoires', title: 't', description: 'd', city: '  Port-Gentil  ' })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.city).toBe('Port-Gentil')

    const rawEmpty = JSON.stringify({ categoryId: 'accessoires', title: 't', description: 'd', city: '   ' })
    expect(parseCategoryListingDraftResponse(rawEmpty, categories).city).toBeNull()
  })

  it('tronque le titre à 120 caractères et la description à 3000', () => {
    const raw = JSON.stringify({
      categoryId: 'accessoires',
      title: 'a'.repeat(200),
      description: 'b'.repeat(3500),
    })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.title).toHaveLength(120)
    expect(draft.description).toHaveLength(3000)
  })

  it('renvoie une chaîne vide quand title/description ne sont pas des chaînes', () => {
    const raw = JSON.stringify({ categoryId: 'accessoires', title: 42, description: null })
    const draft = parseCategoryListingDraftResponse(raw, categories)
    expect(draft.title).toBe('')
    expect(draft.description).toBe('')
  })
})

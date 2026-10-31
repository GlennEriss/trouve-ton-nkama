import { buildManualListingDraft, manualListingFields, propertyTypes } from '../manualListing';

describe('manual listing without Gemini', () => {
  it.each(propertyTypes)('accepts explicit fields for $value', ({ value }) => {
    const values: Record<string, string> = { title: 'Mon bien', price: '100000', typeProperty: value, status: 'FOR_RENT', contact: '+24174123456', area: '40', tags: 'Calme' };
    for (const field of manualListingFields(true, values, [])) {
      if (!values[field.key]) values[field.key] = field.numeric ? '0' : field.options?.[0].value ?? 'Simple';
    }
    const draft = buildManualListingDraft(true, values, 'Description conservée sans génération.', []);
    expect(draft).toMatchObject({ title: 'Mon bien', price: 100000, typeProperty: value, tags: ['Calme'] });
  });

  it('does not infer missing price/type/contact from prose', () => {
    expect(() => buildManualListingDraft(true, {}, 'Maison à louer pour 100000 FCFA.', [])).toThrow('Titre');
  });

  it('validates category attributes and keeps the original description', () => {
    const leaves = [{ id: 'robes', name: 'Robes', rootName: 'Mode', attributeSchema: [{ key: 'size', label: 'Taille', type: 'enum' as const, options: ['M'], required: true }] }] as any;
    const values = { title: 'Robe', price: '8000', categoryId: 'robes', cities: 'Libreville, Franceville', 'attribute:size': 'M' };
    expect(buildManualListingDraft(false, values, 'Ma robe en bon état.', leaves)).toMatchObject({ price: 8000, cities: ['Libreville', 'Franceville'], attributes: { size: 'M' }, description: 'Ma robe en bon état.' });
    expect(() => buildManualListingDraft(false, { ...values, 'attribute:size': 'X' }, 'Ma robe en bon état.', leaves)).toThrow('Choix invalide');
  });
});

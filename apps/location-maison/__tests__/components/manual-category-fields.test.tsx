import { buildManualCategoryDraft } from '@/components/publish/ManualCategoryFields';

const leaves = [{ id: 'robes', name: 'Robes', rootName: 'Mode', attributeSchema: [
  { key: 'size', label: 'Taille', type: 'enum', required: true, options: ['M', 'L'] },
  { key: 'new', label: 'Neuf', type: 'boolean', required: true },
  { key: 'quantity', label: 'Quantité', type: 'number', required: false },
] }] as any;
const values = { title: 'Robe', price: '8000', categoryId: 'robes', cities: 'Libreville, Franceville', attributes: { size: 'M', new: 'false', quantity: '2' } };

describe('manual category draft', () => {
  it('keeps user text and converts only explicit structured values', () => {
    expect(buildManualCategoryDraft(values, 'Description originale.', leaves)).toEqual({ title: 'Robe', description: 'Description originale.', price: 8000, categoryId: 'robes', cities: ['Libreville', 'Franceville'], attributes: { size: 'M', new: false, quantity: 2 } });
  });
  it.each([
    { ...values, categoryId: 'missing' }, { ...values, title: '' }, { ...values, price: '' },
    { ...values, price: '-1' }, { ...values, cities: ',' }, { ...values, attributes: {} },
    { ...values, attributes: { ...values.attributes, size: 'invalid' } },
    { ...values, attributes: { ...values.attributes, quantity: 'NaN' } },
    { ...values, attributes: { ...values.attributes, new: 'maybe' } },
  ])('rejects missing/invalid fields before upload', (value) => {
    expect(() => buildManualCategoryDraft(value, 'Description originale.', leaves)).toThrow();
  });
});

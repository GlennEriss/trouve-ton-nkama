import type { PublishableCategoryLeaf } from '../api/categories';

export type ManualField = { key: string; label: string; numeric?: boolean; required?: boolean; options?: { value: string; label: string }[] };
export const propertyTypes = [
  ['Home', 'Maison'], ['Studio', 'Studio'], ['Apartment', 'Appartement'], ['Villa', 'Villa'],
  ['Duplex', 'Duplex'], ['Building', 'Immeuble'], ['Desk', 'Bureau'], ['Room', 'Chambre'],
  ['Kiosk', 'Kiosque'], ['Shop', 'Boutique'], ['Land', 'Terrain'], ['Warehouse', 'Entrepôt'],
].map(([value, label]) => ({ value, label }));
const counts: Record<string, string> = {
  nbrRooms: 'Chambres / pièces', nbrKitchens: 'Cuisines', nbrBathrooms: 'Salles de bain', nbrToilets: 'Toilettes',
  nbrGarages: 'Garages', nbrFloors: 'Étages', nbrLivingRoom: 'Salons', nbrFloorStudio: 'Étage du studio',
  nbrFloorApartment: 'Étage de l’appartement', nbrPiscine: 'Piscines', nbrApartments: 'Appartements',
  nbrToilet: 'Toilettes', nbrSections: 'Sections',
};
const housing = ['nbrRooms', 'nbrKitchens', 'nbrBathrooms', 'nbrToilets'];
const byType: Record<string, string[]> = {
  Home: [...housing, 'nbrGarages', 'nbrFloors', 'nbrLivingRoom'], Studio: [...housing, 'nbrFloorStudio'],
  Apartment: [...housing, 'nbrFloorApartment'], Villa: [...housing, 'nbrFloors', 'nbrPiscine', 'nbrGarages'],
  Duplex: [...housing, 'nbrFloors', 'nbrLivingRoom', 'nbrGarages'], Desk: ['nbrToilets', 'nbrRooms'],
  Building: ['nbrApartments', 'nbrFloors'], Shop: ['nbrRooms', 'nbrToilet'], Warehouse: ['nbrSections', 'nbrToilets'],
};
const booleanOptions = [{ value: 'true', label: 'Oui' }, { value: 'false', label: 'Non' }];

export function manualListingFields(realEstate: boolean, values: Record<string, string>, leaves: PublishableCategoryLeaf[]): ManualField[] {
  const fields: ManualField[] = [
    { key: 'title', label: 'Titre', required: true },
    { key: 'price', label: 'Prix (FCFA)', numeric: true, required: true },
  ];
  if (realEstate) return [...fields,
    { key: 'typeProperty', label: 'Type de bien', required: true, options: propertyTypes },
    { key: 'status', label: 'Transaction', required: true, options: [{ value: 'FOR_RENT', label: 'Location' }, { value: 'FOR_SALE', label: 'Vente' }] },
    { key: 'contact', label: 'Téléphone', required: true },
    { key: 'area', label: 'Superficie (m²)', numeric: true, required: true },
    { key: 'tags', label: 'Tags (1 à 6, séparés par une virgule)', required: true },
    ...(byType[values.typeProperty] ?? []).map((key) => ({ key, label: counts[key], numeric: true, required: true })),
    ...(values.typeProperty === 'Room' ? [{ key: 'roomType', label: 'Type de chambre', required: true }] : []),
    ...(values.typeProperty === 'Kiosk' ? [{ key: 'kioskType', label: 'Type de kiosque', required: true }] : []),
    ...(values.typeProperty === 'Building' ? [{ key: 'hasParking', label: 'Parking', required: true, options: booleanOptions }] : []),
  ];
  const category = leaves.find((leaf) => leaf.id === values.categoryId);
  return [...fields,
    { key: 'categoryId', label: 'Catégorie', required: true, options: leaves.map((leaf) => ({ value: leaf.id, label: `${leaf.rootName} — ${leaf.name}` })) },
    { key: 'cities', label: 'Villes (séparées par une virgule)', required: true },
    ...(category?.attributeSchema ?? []).map((field) => ({
      key: `attribute:${field.key}`, label: field.label, required: field.required, numeric: field.type === 'number',
      options: field.type === 'boolean' ? booleanOptions : field.type === 'enum' ? (field.options ?? []).map((value) => ({ value, label: value })) : undefined,
    })),
  ];
}

export function buildManualListingDraft(realEstate: boolean, values: Record<string, string>, description: string, leaves: PublishableCategoryLeaf[]): Record<string, unknown> {
  if (description.trim().length < 10) throw new Error('La description doit contenir au moins 10 caractères.');
  const draft: Record<string, unknown> = { description: description.trim() };
  const attributes: Record<string, unknown> = {};
  for (const field of manualListingFields(realEstate, values, leaves)) {
    const value = values[field.key]?.trim() ?? '';
    if (!value) {
      if (field.required) throw new Error(`Renseigne : ${field.label}.`);
      continue;
    }
    if (field.options && !field.options.some((option) => option.value === value)) throw new Error(`Choix invalide : ${field.label}.`);
    if (field.numeric && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`Nombre invalide : ${field.label}.`);
    const isBoolean = field.key === 'hasParking' || (!realEstate && leaves.find((leaf) => leaf.id === values.categoryId)?.attributeSchema.find((attribute) => `attribute:${attribute.key}` === field.key)?.type === 'boolean');
    const parsed = field.numeric ? Number(value) : isBoolean ? value === 'true' : value;
    if (field.key.startsWith('attribute:')) attributes[field.key.slice(10)] = parsed;
    else draft[field.key] = parsed;
  }
  if (realEstate) {
    const tags = values.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    if (tags.length < 1 || tags.length > 6) throw new Error('Indique entre 1 et 6 tags.');
    draft.tags = tags;
  } else {
    draft.attributes = attributes;
    draft.cities = values.cities.split(',').map((city) => city.trim()).filter(Boolean);
    if (!(draft.cities as string[]).length) throw new Error('Indique une ville.');
  }
  return draft;
}

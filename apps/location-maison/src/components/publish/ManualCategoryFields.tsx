'use client';
import type { PublishableCategoryLeaf } from '@/app/api/categories/publishable-leaves/route';

export type ManualCategoryValues = {
  title: string; price: string; categoryId: string; cities: string;
  attributes: Record<string, string>;
};
export const emptyManualCategory: ManualCategoryValues = { title: '', price: '', categoryId: '', cities: '', attributes: {} };

export function buildManualCategoryDraft(value: ManualCategoryValues, description: string, leaves: PublishableCategoryLeaf[]) {
  const category = leaves.find((leaf) => leaf.id === value.categoryId);
  if (!category) throw new Error('Choisis une catégorie.');
  if (!value.title.trim()) throw new Error('Indique un titre.');
  const price = Number(value.price);
  if (!value.price.trim() || !Number.isFinite(price) || price < 0) throw new Error('Indique un prix valide.');
  const cities = value.cities.split(',').map((city) => city.trim()).filter(Boolean);
  if (!cities.length) throw new Error('Indique au moins une ville.');
  const attributes: Record<string, string | number | boolean> = {};
  for (const field of category.attributeSchema) {
    const raw = value.attributes[field.key]?.trim() ?? '';
    if (!raw) {
      if (field.required) throw new Error(`Renseigne : ${field.label}.`);
      continue;
    }
    if (field.type === 'enum' && !field.options?.includes(raw)) throw new Error(`Choix invalide : ${field.label}.`);
    if (field.type === 'number' && !Number.isFinite(Number(raw))) throw new Error(`Nombre invalide : ${field.label}.`);
    if (field.type === 'boolean' && !['true', 'false'].includes(raw)) throw new Error(`Choix invalide : ${field.label}.`);
    attributes[field.key] = field.type === 'number' ? Number(raw) : field.type === 'boolean' ? raw === 'true' : raw;
  }
  return { title: value.title.trim(), description: description.trim(), price, categoryId: category.id, cities, attributes };
}

export default function ManualCategoryFields({ value, onChange, leaves, disabled }: {
  value: ManualCategoryValues; onChange: (value: ManualCategoryValues) => void;
  leaves: PublishableCategoryLeaf[]; disabled: boolean;
}) {
  const inputClass = 'mt-1 min-h-12 w-full rounded-lg border bg-background p-3 text-base';
  const category = leaves.find((leaf) => leaf.id === value.categoryId);
  return <fieldset disabled={disabled} className="space-y-4">
    <legend className="mb-3 text-sm text-muted-foreground">Saisie manuelle — aucun crédit IA débité.</legend>
    <label className="block">Catégorie
      <select className={inputClass} value={value.categoryId} onChange={(event) => onChange({ ...value, categoryId: event.target.value, attributes: {} })}>
        <option value="">Choisir</option>
        {leaves.map((leaf) => <option key={leaf.id} value={leaf.id}>{leaf.rootName} — {leaf.name}</option>)}
      </select>
    </label>
    {(['title', 'price', 'cities'] as const).map((key) => <label className="block" key={key}>
      {{ title: 'Titre', price: 'Prix (FCFA)', cities: 'Villes (séparées par une virgule)' }[key]}
      <input className={inputClass} type={key === 'price' ? 'number' : 'text'} min={key === 'price' ? 0 : undefined} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
    </label>)}
    {category?.attributeSchema.map((field) => <label className="block" key={field.key}>
      {field.label}{field.required ? ' *' : ''}
      {field.type === 'enum' || field.type === 'boolean' ? <select className={inputClass} value={value.attributes[field.key] ?? ''} onChange={(event) => onChange({ ...value, attributes: { ...value.attributes, [field.key]: event.target.value } })}>
        <option value="">Choisir</option>
        {(field.type === 'boolean' ? ['true', 'false'] : field.options ?? []).map((option) => <option key={option} value={option}>{field.type === 'boolean' ? (option === 'true' ? 'Oui' : 'Non') : option}</option>)}
      </select> : <input className={inputClass} type={field.type === 'number' ? 'number' : 'text'} value={value.attributes[field.key] ?? ''} onChange={(event) => onChange({ ...value, attributes: { ...value.attributes, [field.key]: event.target.value } })} />}
    </label>)}
  </fieldset>;
}

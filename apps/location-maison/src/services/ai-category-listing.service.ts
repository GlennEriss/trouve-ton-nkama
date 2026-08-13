import type { PublishableAttributeField, PublishableCategoryLeaf } from '@/app/api/categories/publishable-leaves/route';

/**
 * Prompt IA générique multi-catégorie (Lot 7) — pendant du prompt immobilier
 * (`AIPromptsService.getAutoFillPromptWithTypeDetection`), qui détecte lui-même le
 * type de bien parmi une liste en dur (`CREATABLE_TYPES`). Ici la détection porte sur
 * la catégorie ET ses champs sont pilotés par `attributeSchema` — une nouvelle
 * catégorie change ce que l'IA peut choisir/remplir sans toucher ce fichier.
 */
export function buildCategoryListingDraftPrompt(
  userDescription: string,
  categories: PublishableCategoryLeaf[],
): string {
  const categoriesSpec = categories
    .map((category) => {
      const fieldsSpec = category.attributeSchema
        .map((field) => {
          if (field.type === 'enum') {
            return `      - "${field.key}" (${field.label}) : une valeur EXACTE parmi [${(field.options ?? [])
              .map((option) => `"${option}"`)
              .join(', ')}]`;
          }
          return `      - "${field.key}" (${field.label}) : ${field.type === 'number' ? 'nombre' : field.type === 'boolean' ? 'true/false' : 'texte court'}`;
        })
        .join('\n');
      return `  - id "${category.id}" — ${category.rootName} > ${category.name}\n    Attributs :\n${fieldsSpec || '      (aucun)'}`;
    })
    .join('\n');

  return `
Tu es un assistant qui aide un vendeur particulier au Gabon à rédiger une annonce de petite
annonce (hors immobilier) sur Trouve Ton Nkama, à partir d'une description libre.

DESCRIPTION DU VENDEUR :
"${userDescription}"

ÉTAPE 1 — DÉTERMINE LA CATÉGORIE la plus proche de l'article décrit, en choisissant
EXACTEMENT un "id" parmi cette liste :
${categoriesSpec}

ÉTAPE 2 — Remplis l'annonce, y compris le bloc "attributes" QUI DOIT CORRESPONDRE
UNIQUEMENT à la catégorie choisie (ne mélange jamais les attributs de deux catégories).

RÈGLES :
- Réponds TOUJOURS en français.
- N'invente jamais un prix, une ville ou un attribut absent de la description : mets null.
- Le titre doit être court (60 caractères max), vendeur, sans emoji.
- La description doit rester fidèle à ce que le vendeur a écrit, juste mieux formulée
  (corrige l'orthographe, structure en phrases claires), sans ajouter d'information inventée.
- Si la description ne correspond clairement à AUCUNE catégorie de la liste, mets
  "categoryId": null plutôt que de deviner au hasard.

Réponds UNIQUEMENT avec un objet JSON (pas de texte autour, pas de \`\`\`), exactement sous
cette forme :
{
  "categoryId": "un id de la liste ci-dessus, ou null",
  "title": "string",
  "description": "string",
  "price": number ou null,
  "city": "string ou null",
  "attributes": { ... selon la catégorie choisie ... }
}
`.trim();
}

export type CategoryListingDraft = {
  categoryId: string;
  title: string;
  description: string;
  price: number | null;
  city: string | null;
  attributes: Record<string, string | number | boolean>;
};

export class CategoryListingDraftError extends Error {}

/**
 * Gemini renvoie parfois un nombre sous forme de chaîne dans le JSON ("15000" au lieu de
 * 15000, parfois avec espaces/virgules de milliers ou un suffixe "FCFA") malgré la
 * consigne du prompt — un `typeof value === 'number'` strict perd alors silencieusement
 * une valeur pourtant bien détectée par l'IA. Même problème et même remède que
 * `AIFormService.normalizeNumber` côté immobilier (`services/ai-form.service.ts`).
 */
function coerceToNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value
    .trim()
    .replace(/\s*(?:fcfa|xaf|f\s*cfa|francs?)\s*$/gi, '')
    .replace(/\s+/g, '')
    .replace(/(?<=\d)[.,](?=\d{3}\b)/g, '')
    .replace(',', '.');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCategoryListingDraftResponse(
  raw: string,
  categories: PublishableCategoryLeaf[],
): CategoryListingDraft {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  const parsed = JSON.parse(jsonSlice) as {
    categoryId?: unknown;
    title?: unknown;
    description?: unknown;
    price?: unknown;
    city?: unknown;
    attributes?: unknown;
  };

  const categoryId = typeof parsed.categoryId === 'string' ? parsed.categoryId.trim() : '';
  const matchedCategory = categories.find((category) => category.id === categoryId);
  if (!matchedCategory) {
    throw new CategoryListingDraftError('CATEGORY_DETECTION_FAILED');
  }

  const rawAttributes =
    parsed.attributes && typeof parsed.attributes === 'object' && !Array.isArray(parsed.attributes)
      ? (parsed.attributes as Record<string, unknown>)
      : {};

  const attributes: Record<string, string | number | boolean> = {};
  for (const field of matchedCategory.attributeSchema as PublishableAttributeField[]) {
    const value = rawAttributes[field.key];
    if (value === null || value === undefined || value === '') continue;

    if (field.type === 'number') {
      const numericValue = coerceToNumber(value);
      if (numericValue !== null) {
        attributes[field.key] = numericValue;
      }
    } else if (field.type === 'boolean' && typeof value === 'boolean') {
      attributes[field.key] = value;
    } else if (field.type === 'enum' && typeof value === 'string' && (field.options ?? []).includes(value)) {
      attributes[field.key] = value;
    } else if (field.type === 'text' && typeof value === 'string') {
      attributes[field.key] = value;
    }
    // Valeur de type/forme inattendue : on l'ignore plutôt que de la forcer —
    // l'utilisateur complète ce champ à la main sur la preview brouillon.
  }

  return {
    categoryId: matchedCategory.id,
    title: typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 120) : '',
    description: typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 3000) : '',
    price: (() => {
      const numericPrice = coerceToNumber(parsed.price);
      return numericPrice !== null && numericPrice > 0 ? numericPrice : null;
    })(),
    city: typeof parsed.city === 'string' && parsed.city.trim().length > 0 ? parsed.city.trim() : null,
    attributes,
  };
}

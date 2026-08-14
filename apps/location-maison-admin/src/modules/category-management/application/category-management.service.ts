import type {
  CategoryAttributeSchemaField,
  CategoryPromotionPricing,
  CreateListingCategoryInput,
  ListingCategoryPatch,
  UpdateListingCategoryInput,
} from "@/modules/category-management/domain/types";
import {
  countChildCategories,
  createListingCategory,
  deleteListingCategory,
  findListingCategoryBySlug,
  getListingCategoryById,
  listListingCategories,
  normalizeSlug,
  updateListingCategory,
} from "@/modules/category-management/infrastructure/category.repository";

function validateName(name: string) {
  if (name.length < 2 || name.length > 60) {
    throw new Error("CATEGORY_INVALID_NAME");
  }
}

function validateOrder(order: number) {
  if (!Number.isFinite(order) || order < 0 || order > 100000) {
    throw new Error("CATEGORY_INVALID_ORDER");
  }
}

function validateAttributeSchema(fields: CategoryAttributeSchemaField[] | undefined) {
  if (!fields) {
    return;
  }
  const seenKeys = new Set<string>();
  for (const field of fields) {
    if (!/^[a-z][a-z0-9_]{1,49}$/.test(field.key)) {
      throw new Error("CATEGORY_INVALID_ATTRIBUTE_KEY");
    }
    if (seenKeys.has(field.key)) {
      throw new Error("CATEGORY_DUPLICATE_ATTRIBUTE_KEY");
    }
    seenKeys.add(field.key);
    if (!field.label || field.label.trim().length === 0) {
      throw new Error("CATEGORY_INVALID_ATTRIBUTE_LABEL");
    }
    if (field.type === "enum" && (!field.options || field.options.length === 0)) {
      throw new Error("CATEGORY_ENUM_REQUIRES_OPTIONS");
    }
  }
}

function validatePromotionPricing(pricing: CategoryPromotionPricing | undefined) {
  if (!pricing) {
    return;
  }
  for (const [type, entry] of Object.entries(pricing)) {
    if (!entry) continue;
    if (!Number.isFinite(entry.credits) || entry.credits < 0 || entry.credits > 1000) {
      throw new Error(`CATEGORY_INVALID_PROMOTION_PRICING:${type}`);
    }
    if (!Number.isFinite(entry.duration) || entry.duration < 0 || entry.duration > 90) {
      throw new Error(`CATEGORY_INVALID_PROMOTION_PRICING:${type}`);
    }
  }
}

async function assertValidParent(parentId: string | null) {
  if (parentId === null) {
    return;
  }
  const parent = await getListingCategoryById(parentId);
  if (!parent) {
    throw new Error("CATEGORY_PARENT_NOT_FOUND");
  }
  if (parent.parentId !== null) {
    // L'arbre est volontairement limité à 2 niveaux (racine -> feuille) — voir
    // docs/marketplace-multi-categories/00-le-vrai-probleme.md. Une catégorie dont le
    // parent a lui-même un parent créerait une profondeur non prévue par la recherche/
    // l'accueil (facette hiérarchique Algolia à 2 niveaux : lvl0/lvl1).
    throw new Error("CATEGORY_MAX_DEPTH_EXCEEDED");
  }
}

async function assertSlugAvailable(slug: string, excludeCategoryId?: string) {
  const existing = await findListingCategoryBySlug(slug);
  if (existing && existing.id !== excludeCategoryId) {
    throw new Error("CATEGORY_SLUG_ALREADY_EXISTS");
  }
}

export async function listCategories() {
  const categories = await listListingCategories();
  return {
    categories,
    count: categories.length,
  };
}

export async function getCategory(categoryId: string) {
  const trimmed = categoryId.trim();
  if (!trimmed) {
    throw new Error("CATEGORY_INVALID_ID");
  }
  return getListingCategoryById(trimmed);
}

export async function createCategory(input: CreateListingCategoryInput) {
  const name = input.name.trim().replace(/\s+/g, " ");
  validateName(name);
  const order = Math.trunc(input.order ?? 0);
  validateOrder(order);
  validateAttributeSchema(input.attributeSchema);
  validatePromotionPricing(input.promotionPricing);

  const slug = normalizeSlug(input.slug || name);
  if (!slug) {
    throw new Error("CATEGORY_INVALID_SLUG");
  }

  await assertValidParent(input.parentId);
  await assertSlugAvailable(slug);

  return createListingCategory({
    ...input,
    name,
    slug,
    order,
  });
}

export async function updateCategory(input: UpdateListingCategoryInput) {
  const categoryId = input.categoryId.trim();
  if (!categoryId) {
    throw new Error("CATEGORY_INVALID_ID");
  }

  const existing = await getListingCategoryById(categoryId);
  if (!existing) {
    return null;
  }

  if (Object.keys(input.patch).length === 0) {
    throw new Error("CATEGORY_EMPTY_PATCH");
  }

  const patch: ListingCategoryPatch = { ...input.patch };

  if (typeof patch.name === "string") {
    patch.name = patch.name.trim().replace(/\s+/g, " ");
    validateName(patch.name);
  }
  if (typeof patch.order === "number") {
    validateOrder(patch.order);
  }
  if (patch.attributeSchema) {
    validateAttributeSchema(patch.attributeSchema);
  }
  if (patch.promotionPricing) {
    validatePromotionPricing(patch.promotionPricing);
  }
  if (typeof patch.slug === "string") {
    const slug = normalizeSlug(patch.slug);
    if (!slug) {
      throw new Error("CATEGORY_INVALID_SLUG");
    }
    await assertSlugAvailable(slug, categoryId);
    patch.slug = slug;
  }
  if (patch.parentId !== undefined) {
    if (patch.parentId === categoryId) {
      throw new Error("CATEGORY_CANNOT_BE_OWN_PARENT");
    }
    await assertValidParent(patch.parentId);
    if (patch.parentId !== existing.parentId) {
      // Un nœud racine qui a déjà des enfants ne peut pas devenir une feuille : ça
      // laisserait des catégories orphelines à 3 niveaux de profondeur.
      const childCount = await countChildCategories(categoryId);
      if (childCount > 0) {
        throw new Error("CATEGORY_HAS_CHILDREN");
      }
    }
  }

  return updateListingCategory({
    categoryId,
    patch,
    actorUid: input.actorUid,
  });
}

export async function removeCategory(categoryId: string) {
  const trimmed = categoryId.trim();
  if (!trimmed) {
    throw new Error("CATEGORY_INVALID_ID");
  }

  const childCount = await countChildCategories(trimmed);
  if (childCount > 0) {
    throw new Error("CATEGORY_HAS_CHILDREN");
  }

  return deleteListingCategory(trimmed);
}

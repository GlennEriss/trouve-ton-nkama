import { getProvinceByName } from "@trouve-ton-nkama/core/domain";

import { normalizeGabonPhoneE164 } from "@/lib/phone/gabon-phone";
import { findPlatformUserByUid } from "@/modules/account-provisioning/infrastructure/account-provisioning.repository";
import { getListingCategoryById } from "@/modules/category-management/infrastructure/category.repository";
import type {
  CategoryListingAttributeValue,
  CreateCategoryListingInput,
  CreateCategoryListingResult,
} from "@/modules/category-listing/domain/types";
import type { CategoryAttributeSchemaField } from "@/modules/category-management/domain/types";
import { createCategoryListingDocument, listCategoryListingDocuments } from "@/modules/category-listing/infrastructure/category-listing.repository";

export async function listCategoryListings() {
  const listings = await listCategoryListingDocuments();
  return { listings, count: listings.length };
}

function hasAnnouncerRole(roles: string[]) {
  return roles.some((role) => role.trim().toLowerCase() === "announcer");
}

function validateAttributes(
  schema: CategoryAttributeSchemaField[],
  attributes: Record<string, CategoryListingAttributeValue>,
) {
  const schemaByKey = new Map(schema.map((field) => [field.key, field]));

  for (const field of schema) {
    const value = attributes[field.key];
    if (field.required && (value === undefined || value === null || value === "")) {
      throw new Error(`ATTRIBUTE_REQUIRED:${field.key}`);
    }
    if (value === undefined || value === null) {
      continue;
    }
    if (field.type === "number" && typeof value !== "number") {
      throw new Error(`ATTRIBUTE_INVALID_TYPE:${field.key}`);
    }
    if (field.type === "boolean" && typeof value !== "boolean") {
      throw new Error(`ATTRIBUTE_INVALID_TYPE:${field.key}`);
    }
    if (field.type === "text" && typeof value !== "string") {
      throw new Error(`ATTRIBUTE_INVALID_TYPE:${field.key}`);
    }
    if (field.type === "enum") {
      if (typeof value !== "string" || !(field.options ?? []).includes(value)) {
        throw new Error(`ATTRIBUTE_INVALID_OPTION:${field.key}`);
      }
    }
  }

  // Ne garder que les clés déclarées dans le schéma : défense contre une saisie qui
  // enverrait des attributs inconnus (pas d'attribut "sauvage" dans l'index Algolia).
  const sanitized: Record<string, CategoryListingAttributeValue> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (schemaByKey.has(key) && value !== undefined && value !== null && value !== "") {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function createCategoryListing(
  input: CreateCategoryListingInput,
): Promise<CreateCategoryListingResult> {
  const categoryId = input.categoryId.trim();
  if (!categoryId) {
    throw new Error("CATEGORY_LISTING_INVALID_CATEGORY");
  }

  const category = await getListingCategoryById(categoryId);
  if (!category) {
    throw new Error("CATEGORY_LISTING_CATEGORY_NOT_FOUND");
  }
  if (category.parentId === null) {
    // Une annonce se publie toujours sous une feuille (ex. "Vêtements"), jamais
    // directement sous une racine (ex. "Mode") — voir la règle d'arbre du Lot 0.
    throw new Error("CATEGORY_LISTING_CATEGORY_IS_ROOT");
  }

  const root = await getListingCategoryById(category.parentId);
  if (!root) {
    throw new Error("CATEGORY_LISTING_ROOT_NOT_FOUND");
  }

  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) {
    throw new Error("CATEGORY_LISTING_INVALID_TITLE");
  }

  const description = input.description.trim();
  if (description.length < 10 || description.length > 3000) {
    throw new Error("CATEGORY_LISTING_INVALID_DESCRIPTION");
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("CATEGORY_LISTING_INVALID_PRICE");
  }

  if (input.images.length === 0) {
    throw new Error("CATEGORY_LISTING_IMAGES_REQUIRED");
  }

  const city = input.city.trim();
  if (city.length < 2 || city.length > 80) {
    throw new Error("CATEGORY_LISTING_INVALID_CITY");
  }

  const province = getProvinceByName(input.province.trim());
  if (!province) {
    throw new Error("CATEGORY_LISTING_INVALID_PROVINCE");
  }

  const announcerUid = input.announcerUid.trim();
  const announcer = await findPlatformUserByUid(announcerUid);
  if (!announcer) {
    throw new Error("CATEGORY_LISTING_ANNOUNCER_NOT_FOUND");
  }
  if (!hasAnnouncerRole(announcer.roles)) {
    throw new Error("CATEGORY_LISTING_ANNOUNCER_ROLE_REQUIRED");
  }

  const trimmedContact = (input.contact ?? "").trim();
  const contact =
    (trimmedContact ? normalizeGabonPhoneE164(trimmedContact) ?? trimmedContact : "") ||
    announcer.phoneNumbers[0] ||
    "";
  if (!contact) {
    throw new Error("CATEGORY_LISTING_CONTACT_REQUIRED");
  }

  const attributes = validateAttributes(category.attributeSchema, input.attributes);

  const categoryPath = { lvl0: root.name, lvl1: `${root.name} > ${category.name}` };

  const propertyId = await createCategoryListingDocument({
    categoryId: category.id,
    categoryPath,
    attributes,
    title,
    description,
    price: input.price,
    province: province.name,
    city,
    latitude: province.lat,
    longitude: province.lng,
    images: input.images,
    contact,
    whatsappContact: input.whatsappContact?.trim() || undefined,
    callContact: input.callContact?.trim() || undefined,
    announcerUid,
    actorUid: input.actorUid,
  });

  return {
    propertyId,
    categoryId: category.id,
    categoryPath,
    announcerUid,
    moderationStatus: "PENDING",
  };
}

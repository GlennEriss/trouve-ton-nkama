import type {
  CreateListingTagInput,
  UpdateListingTagInput,
} from "@/modules/tag-management/domain/types";
import {
  createListingTag,
  deleteListingTag,
  getListingTagById,
  listListingTags,
  updateListingTag,
} from "@/modules/tag-management/infrastructure/tag.repository";

function sanitizeTagName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function validateTagName(name: string) {
  if (name.length < 2 || name.length > 50) {
    throw new Error("TAG_INVALID_NAME");
  }
}

function validateTagOrder(order: number) {
  if (!Number.isFinite(order) || order < 0 || order > 100000) {
    throw new Error("TAG_INVALID_ORDER");
  }
}

export async function listTags() {
  const tags = await listListingTags();
  return {
    tags,
    count: tags.length,
  };
}

export async function getTag(tagId: string) {
  const trimmed = tagId.trim();
  if (!trimmed) {
    throw new Error("TAG_INVALID_ID");
  }
  return getListingTagById(trimmed);
}

export async function createTag(input: CreateListingTagInput) {
  const name = sanitizeTagName(input.name);
  validateTagName(name);
  const order = Math.trunc(input.order ?? 0);
  validateTagOrder(order);

  return createListingTag({
    ...input,
    name,
    order,
  });
}

export async function updateTag(input: UpdateListingTagInput) {
  const tagId = input.tagId.trim();
  if (!tagId) {
    throw new Error("TAG_INVALID_ID");
  }

  if (Object.keys(input.patch).length === 0) {
    throw new Error("TAG_EMPTY_PATCH");
  }

  const patch: UpdateListingTagInput["patch"] = {};
  if (typeof input.patch.name === "string") {
    const name = sanitizeTagName(input.patch.name);
    validateTagName(name);
    patch.name = name;
  }
  if (typeof input.patch.order === "number") {
    const order = Math.trunc(input.patch.order);
    validateTagOrder(order);
    patch.order = order;
  }
  if (typeof input.patch.isActive === "boolean") {
    patch.isActive = input.patch.isActive;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("TAG_EMPTY_PATCH");
  }

  return updateListingTag({
    ...input,
    tagId,
    patch,
  });
}

export async function removeTag(tagId: string) {
  const trimmed = tagId.trim();
  if (!trimmed) {
    throw new Error("TAG_INVALID_ID");
  }
  return deleteListingTag(trimmed);
}

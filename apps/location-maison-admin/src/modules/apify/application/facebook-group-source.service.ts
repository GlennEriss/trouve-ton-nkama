import type {
  CreateFacebookGroupSourceInput,
  UpdateFacebookGroupSourceInput,
} from "@/modules/apify/domain/group-source.types";
import {
  createFacebookGroupSource,
  deleteFacebookGroupSource,
  listFacebookGroupSources,
  updateFacebookGroupSource,
} from "@/modules/apify/infrastructure/facebook-group-source.repository";

function sanitizeLabel(label: string | undefined | null): string | null {
  if (typeof label !== "string") {
    return null;
  }
  const trimmed = label.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function validateLabel(label: string | null) {
  if (label && label.length > 80) {
    throw new Error("GROUP_INVALID_LABEL");
  }
}

export async function listGroupSources() {
  const groups = await listFacebookGroupSources();
  return { groups, count: groups.length };
}

export async function createGroupSource(input: CreateFacebookGroupSourceInput) {
  const url = input.url.trim();
  if (!url) {
    throw new Error("GROUP_URL_INVALID");
  }
  const label = sanitizeLabel(input.label);
  validateLabel(label);

  return createFacebookGroupSource({ ...input, url, label: label ?? undefined });
}

export async function updateGroupSource(input: UpdateFacebookGroupSourceInput) {
  const groupId = input.groupId.trim();
  if (!groupId) {
    throw new Error("GROUP_INVALID_ID");
  }
  if (Object.keys(input.patch).length === 0) {
    throw new Error("GROUP_EMPTY_PATCH");
  }

  const patch: UpdateFacebookGroupSourceInput["patch"] = {};
  if (typeof input.patch.url === "string") {
    const url = input.patch.url.trim();
    if (!url) {
      throw new Error("GROUP_URL_INVALID");
    }
    patch.url = url;
  }
  if (typeof input.patch.label !== "undefined") {
    const label = sanitizeLabel(input.patch.label);
    validateLabel(label);
    patch.label = label;
  }

  return updateFacebookGroupSource({ ...input, groupId, patch });
}

export async function removeGroupSource(groupId: string) {
  const trimmed = groupId.trim();
  if (!trimmed) {
    throw new Error("GROUP_INVALID_ID");
  }
  return deleteFacebookGroupSource(trimmed);
}

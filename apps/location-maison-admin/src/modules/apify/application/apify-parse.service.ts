import type { ApifyParseResult, ApifyRawPost } from "../domain/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse the JSON pasted from Apify.
 *
 * Apify exports a bare array of posts, but we also tolerate the
 * `{ items: [...] }` wrapper that some dataset exports use. Non-object entries
 * are dropped.
 */
export function parseApifyJson(raw: string): ApifyParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Le contenu est vide. Collez le JSON renvoyé par Apify." };
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "JSON invalide : impossible de parser le contenu collé." };
  }

  let items: unknown[] | null = null;
  if (Array.isArray(data)) {
    items = data;
  } else if (isRecord(data) && Array.isArray(data.items)) {
    items = data.items;
  }

  if (!items) {
    return {
      ok: false,
      error: "Format inattendu : un tableau de posts (ou un objet { items: [...] }) était attendu.",
    };
  }

  const posts = items.filter(isRecord) as ApifyRawPost[];
  return { ok: true, posts };
}

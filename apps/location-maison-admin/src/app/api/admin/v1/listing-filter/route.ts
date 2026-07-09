import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { filterListings } from "@/modules/listing-filter/application/listing-filter.service";
import type { ApifyFacebookPost } from "@/modules/listing-filter/domain/types";

const postSchema = z.record(z.string(), z.unknown());

// On accepte deux formes pour coller l'export Apify le plus simplement possible :
//  - un objet { posts: [...], annotate?: boolean }
//  - directement le tableau brut [...] produit par Apify
const wrappedSchema = z
  .object({
    posts: z.array(postSchema).min(1).max(5000),
    annotate: z.boolean().optional(),
  })
  .strict();

const bodySchema = z.union([wrappedSchema, z.array(postSchema).min(1).max(5000)]);

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "social_import.read");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message:
          "Fournis le tableau Apify directement, ou un objet { posts: [...] } (1 à 5000 posts).",
        details: { issues: parsed.error.issues },
      },
      400,
      auth.correlationId,
    );
  }

  const posts = (
    Array.isArray(parsed.data) ? parsed.data : parsed.data.posts
  ) as ApifyFacebookPost[];
  const annotate = Array.isArray(parsed.data) ? false : parsed.data.annotate ?? false;

  const result = filterListings(posts, { annotate });

  return jsonSuccess(result, auth.correlationId, 200);
}

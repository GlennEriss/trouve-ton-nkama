import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getFirebaseAdminStorage } from "@/lib/firebase/firebase-admin";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const MAX_BYTES = 3 * 1024 * 1024; // 3 Mo
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "ads_campaigns.create");
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError({ code: "VALIDATION_ERROR", message: "Requête multipart invalide." }, 400, auth.correlationId);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Fichier manquant." }, 400, auth.correlationId);
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Format non supporté (JPG, PNG, WEBP ou GIF)." },
      400,
      auth.correlationId,
    );
  }
  if (file.size > MAX_BYTES) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Image trop lourde (max 3 Mo)." }, 400, auth.correlationId);
  }

  try {
    const bucket = getFirebaseAdminStorage().bucket();
    const imagePATH = `ad-campaigns/${Date.now()}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Token de téléchargement Firebase : produit une URL publique stable
    // (firebasestorage.googleapis.com), sans dépendre d'ACL objet — compatible
    // avec l'uniform bucket-level access activé par défaut.
    const downloadToken = randomUUID();
    const gcsFile = bucket.file(imagePATH);
    await gcsFile.save(buffer, {
      contentType: file.type,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000",
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const imageURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      imagePATH,
    )}?alt=media&token=${downloadToken}`;
    return jsonSuccess({ imagePATH, imageURL }, auth.correlationId, 201);
  } catch (error) {
    return jsonError(
      { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Échec de l'upload." },
      500,
      auth.correlationId,
    );
  }
}

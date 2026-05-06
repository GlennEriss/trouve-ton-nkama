import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getFirebaseAdminStorage } from "@/lib/firebase/firebase-admin";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function inferExtension(input: File) {
  const filename = input.name.trim().toLowerCase();
  if (filename.endsWith(".png")) return "png";
  if (filename.endsWith(".webp")) return "webp";
  if (filename.endsWith(".jpeg")) return "jpeg";
  if (filename.endsWith(".jpg")) return "jpg";

  if (input.type === "image/png") return "png";
  if (input.type === "image/webp") return "webp";
  return "jpg";
}

function buildDownloadUrl(bucketName: string, filePath: string, token: string) {
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Formulaire invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const announcerUidRaw = formData.get("announcerUid");
  const announcerUid = typeof announcerUidRaw === "string" ? announcerUidRaw.trim() : "";

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Aucune image fournie.",
      },
      400,
      auth.correlationId,
    );
  }

  if (files.length > MAX_FILES) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: `Maximum ${MAX_FILES} images autorisées par annonce.`,
      },
      400,
      auth.correlationId,
    );
  }

  for (const file of files) {
    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "Format image non supporté. Utilise JPG, PNG ou WEBP.",
        },
        400,
        auth.correlationId,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError(
        {
          code: "VALIDATION_ERROR",
          message: `Une image dépasse la taille maximale (${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB).`,
        },
        400,
        auth.correlationId,
      );
    }
  }

  try {
    const storage = getFirebaseAdminStorage();
    const bucket = storage.bucket();
    const subjectUid = announcerUid.length > 0 ? announcerUid : "unknown";

    const uploadedImages: Array<{
      fileURL: string;
      filePATH: string;
      size: number;
      contentType: string;
      originalName: string;
    }> = [];

    for (const file of files) {
      const extension = inferExtension(file);
      const objectPath = `properties/${subjectUid}/${Date.now()}-${randomUUID()}.${extension}`;
      const downloadToken = randomUUID();

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const objectRef = bucket.file(objectPath);
      await objectRef.save(buffer, {
        resumable: false,
        contentType: file.type,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            uploader: "admin_dashboard",
            uploaderUid: auth.admin.uid,
          },
        },
      });

      uploadedImages.push({
        fileURL: buildDownloadUrl(bucket.name, objectPath, downloadToken),
        filePATH: objectPath,
        size: file.size,
        contentType: file.type,
        originalName: file.name,
      });
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.create",
      resource: "property_image_upload",
      resourceId: announcerUid || "unknown",
      status: "success",
      correlationId: auth.correlationId,
      details: {
        count: uploadedImages.length,
        announcerUid: announcerUid || null,
      },
    });

    return jsonSuccess(
      {
        images: uploadedImages,
      },
      auth.correlationId,
      201,
    );
  } catch {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible d'envoyer les images pour le moment.",
      },
      500,
      auth.correlationId,
    );
  }
}

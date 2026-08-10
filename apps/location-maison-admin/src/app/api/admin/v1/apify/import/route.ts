import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getFirebaseAdminStorage } from "@/lib/firebase/firebase-admin";
import { createListingForAnnouncer } from "@/modules/account-provisioning/application/account-provisioning.service";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listingFullSchema, normalizeImages } from "@/modules/listing-management/presentation/listing-validation";
import { downloadRemoteFile, errorDetail, normalizeRemoteUrl } from "@/modules/apify/infrastructure/apify-remote-download";

export const runtime = "nodejs";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20_000;
// Placeholder for required unit numbers that posts never state.
const UNIT_PLACEHOLDER = "NC";
const ROOM_TYPE_PLACEHOLDER = "Chambre américaine";

type UploadedImage = { fileURL: string; filePATH: string };

function buildDownloadUrl(bucketName: string, filePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

// Resolve {extension, contentType} from the response content-type, falling back
// to the URL path extension (fbcdn URLs are ".../xxx_n.jpg?stp=...").
function resolveImageType(contentType: string, url: string): { extension: string; mime: string } | null {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "image/png") return { extension: "png", mime: "image/png" };
  if (type === "image/webp") return { extension: "webp", mime: "image/webp" };
  if (type === "image/jpeg" || type === "image/jpg") return { extension: "jpg", mime: "image/jpeg" };

  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return { extension: "png", mime: "image/png" };
  if (path.endsWith(".webp")) return { extension: "webp", mime: "image/webp" };
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return { extension: "jpg", mime: "image/jpeg" };

  // Some fbcdn responses omit/obscure the type; default to jpeg if it looks like an image.
  if (type.startsWith("image/")) return { extension: "jpg", mime: "image/jpeg" };
  return null;
}

/** Download an image, falling back to DoH + direct-IP when local DNS fails. */
function downloadImage(url: string) {
  return downloadRemoteFile(url, { maxBytes: MAX_IMAGE_BYTES, timeoutMs: DOWNLOAD_TIMEOUT_MS });
}

/** Download a remote (fbcdn) image and re-upload it to our Storage bucket. */
async function uploadRemoteImages(
  urls: string[],
  announcerUid: string,
  uploaderUid: string,
): Promise<{ images: UploadedImage[]; errors: string[] }> {
  const bucket = getFirebaseAdminStorage().bucket();
  const images: UploadedImage[] = [];
  const errors: string[] = [];
  const normalizedUrls: string[] = [];
  const seenUrls = new Set<string>();
  let invalidUrls = 0;

  for (const rawUrl of urls) {
    const normalized = normalizeRemoteUrl(rawUrl);
    if (!normalized) {
      invalidUrls += 1;
      continue;
    }
    if (!seenUrls.has(normalized)) {
      seenUrls.add(normalized);
      normalizedUrls.push(normalized);
    }
  }

  if (invalidUrls > 0) {
    errors.push(`url invalide (${invalidUrls})`);
  }

  const uploadOneImage = async (url: string): Promise<{ image?: UploadedImage; errors: string[] }> => {
    let buffer: Buffer;
    let resolved: { extension: string; mime: string } | null;
    // 1) Download from fbcdn (with DoH + direct-IP fallback on DNS failure).
    try {
      const download = await downloadImage(url);
      if (download.status < 200 || download.status >= 300) {
        return { errors: [`download HTTP ${download.status}`] };
      }
      resolved = resolveImageType(download.contentType, url);
      if (!resolved) {
        return { errors: [`type "${download.contentType || "?"}"`] };
      }
      buffer = download.buffer;
      if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
        return { errors: [`size ${buffer.length}`] };
      }
    } catch (cause) {
      return { errors: [`download: ${errorDetail(cause)}`] };
    }

    // 2) Upload to Storage.
    try {
      const objectPath = `properties/${announcerUid}/${Date.now()}-${randomUUID()}.${resolved.extension}`;
      const token = randomUUID();
      await bucket.file(objectPath).save(buffer, {
        resumable: false,
        contentType: resolved.mime,
        metadata: {
          metadata: { firebaseStorageDownloadTokens: token, uploader: "apify_import", uploaderUid },
        },
      });
      return { image: { fileURL: buildDownloadUrl(bucket.name, objectPath, token), filePATH: objectPath }, errors: [] };
    } catch (cause) {
      return { errors: [`storage: ${cause instanceof Error ? cause.message : "échec"}`] };
    }
  };

  const uploads = await Promise.all(normalizedUrls.slice(0, MAX_IMAGES).map((url) => uploadOneImage(url)));
  for (const upload of uploads) {
    if (upload.image) images.push(upload.image);
    errors.push(...upload.errors);
  }

  return { images, errors };
}

/** Map an Apify draft to the strict listing payload (schema-known keys only). */
function buildListingPayload(draft: Record<string, unknown>, images: UploadedImage[]) {
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const numOrUndef = (value: unknown) => (typeof value === "number" ? value : undefined);

  // Types Duplex/Warehouse/empty are not in the listing enum — remap them.
  const rawType = str(draft.typeProperty);
  const typeProperty = rawType === "Duplex" ? "Home" : rawType === "Warehouse" ? "Property" : rawType;

  const tags = Array.isArray(draft.tags) ? (draft.tags as string[]).filter(Boolean).slice(0, 6) : [];

  return {
    title: str(draft.title),
    description: str(draft.description),
    typeProperty,
    status: str(draft.status),
    isOwner: typeof draft.isOwner === "boolean" ? draft.isOwner : false,
    price: numOrUndef(draft.price),
    area: numOrUndef(draft.area) ?? 0,
    tags: tags.length > 0 ? tags : [str(draft.status) === "FOR_SALE" ? "À vendre" : "À louer"],
    images: normalizeImages(images),
    street: str(draft.street),
    city: str(draft.city),
    province: str(draft.province),
    country: str(draft.country) || "Gabon",
    countryCode: str(draft.countryCode) || "GA",
    longitude: numOrUndef(draft.longitude),
    latitude: numOrUndef(draft.latitude),
    provinceLon: numOrUndef(draft.provinceLon),
    provinceLat: numOrUndef(draft.provinceLat),
    cityLon: numOrUndef(draft.cityLon),
    cityLat: numOrUndef(draft.cityLat),
    streetLon: numOrUndef(draft.streetLon),
    streetLat: numOrUndef(draft.streetLat),
    isLocExact: typeof draft.isLocExact === "boolean" ? draft.isLocExact : false,
    contact: str(draft.contact) || undefined,
    nbrRooms: numOrUndef(draft.nbrRooms),
    nbrKitchens: numOrUndef(draft.nbrKitchens),
    nbrBathrooms: numOrUndef(draft.nbrBathrooms),
    nbrToilets: numOrUndef(draft.nbrToilets),
    nbrGarages: numOrUndef(draft.nbrGarages),
    nbrFloors: numOrUndef(draft.nbrFloors),
    nbrLivingRoom: numOrUndef(draft.nbrLivingRoom),
    nbrFloorStudio: numOrUndef(draft.nbrFloorStudio),
    numeroStudio: typeProperty === "Studio" ? str(draft.numeroStudio) || UNIT_PLACEHOLDER : undefined,
    nbrFloorApartment: numOrUndef(draft.nbrFloorApartment),
    numeroApartment: typeProperty === "Apartment" ? str(draft.numeroApartment) || UNIT_PLACEHOLDER : undefined,
    nbrPiscine: numOrUndef(draft.nbrPiscine),
    nbrApartments: numOrUndef(draft.nbrApartments),
    hasParking: typeof draft.hasParking === "boolean" ? draft.hasParking : undefined,
    nbrToilet: numOrUndef(draft.nbrToilet),
    kioskType: str(draft.kioskType) || undefined,
    roomType: typeProperty === "Room" ? str(draft.roomType) || ROOM_TYPE_PLACEHOLDER : undefined,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as {
    announcerUid?: unknown;
    drafts?: unknown;
  } | null;

  const announcerUid = typeof body?.announcerUid === "string" ? body.announcerUid.trim() : "";
  const drafts = Array.isArray(body?.drafts) ? (body.drafts as Array<Record<string, unknown>>) : [];

  if (!announcerUid) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Annonceur requis." }, 400, auth.correlationId);
  }
  if (drafts.length === 0 || drafts.length > 50) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Fournir entre 1 et 50 annonces." },
      400,
      auth.correlationId,
    );
  }

  const results: Array<{ index: number; ok: boolean; propertyId?: string; imageCount: number; error?: string }> = [];

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    const imageUrls = Array.isArray(draft.images)
      ? (draft.images as Array<{ fileURL?: string }>).map((image) => image?.fileURL).filter((url): url is string => Boolean(url))
      : [];

    let images: UploadedImage[] = [];
    let imageErrors: string[] = [];
    try {
      const result = await uploadRemoteImages(imageUrls, announcerUid, auth.admin.uid);
      images = result.images;
      imageErrors = result.errors;
    } catch (cause) {
      imageErrors = [cause instanceof Error ? cause.message : "échec upload"];
    }

    const payload = buildListingPayload(draft, images);
    const parsed = listingFullSchema.safeParse(payload);
    if (!parsed.success) {
      const fields = Array.from(new Set(parsed.error.issues.map((issue) => issue.path.join(".")))).join(", ");
      let error: string;
      if (images.length === 0 && imageUrls.length === 0) {
        error = "Aucune image dans le post.";
      } else if (images.length === 0) {
        // Surface the real reason (HTTP 403, storage error, …) to diagnose.
        const reason = Array.from(new Set(imageErrors)).slice(0, 3).join(" ; ") || "raison inconnue";
        error = `Échec images (${imageUrls.length}) → ${reason}`;
      } else {
        error = `Champs invalides : ${fields}`;
      }
      results.push({ index, ok: false, imageCount: images.length, error });
      continue;
    }

    try {
      const created = await createListingForAnnouncer({
        announcerUid,
        moderationReviewedBy: auth.admin.uid,
        moderationReviewReason: "Annonce importée et publiée depuis Apify.",
        ...parsed.data,
        images: normalizeImages(parsed.data.images),
      });
      results.push({ index, ok: true, propertyId: created.propertyId, imageCount: images.length });
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";
      const message =
        code === "ANNOUNCER_NOT_FOUND"
          ? "Annonceur introuvable."
          : code === "ANNOUNCER_ROLE_REQUIRED"
            ? "Le compte ciblé n'a pas le rôle annonceur."
            : "Échec de la création.";
      results.push({ index, ok: false, imageCount: images.length, error: message });
    }
  }

  const created = results.filter((result) => result.ok).length;

  await logAudit({
    actorId: auth.admin.uid,
    actorRoles: auth.admin.roles,
    action: "listings.create",
    resource: "apify_import",
    resourceId: announcerUid,
    status: created > 0 ? "success" : "failed",
    correlationId: auth.correlationId,
    details: { announcerUid, total: drafts.length, created },
  });

  return jsonSuccess({ results, created, failed: drafts.length - created }, auth.correlationId, 201);
}

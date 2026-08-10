import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getFirebaseAdminDb, getFirebaseAdminStorage } from "@/lib/firebase/firebase-admin";
import { findPlatformUserByUid } from "@/modules/account-provisioning/infrastructure/account-provisioning.repository";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { downloadRemoteFile, errorDetail } from "@/modules/apify/infrastructure/apify-remote-download";

export const runtime = "nodejs";

const MAX_REELS = 20;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 60_000;

type ReelResult = { index: number; ok: boolean; reelId?: string; error?: string };

/**
 * Create orphan Reels (no propertyId) from Apify post videos, on behalf of an
 * announcer selected in the admin UI — mirrors `apify/import/route.ts` for
 * listings. Reuses the existing Reel pipeline as-is: creating the Firestore
 * doc then dropping the raw file on `reels-raw/{announcerUid}/{reelId}.mp4`
 * is exactly what `POST /api/reels` + the client upload do (see
 * apps/location-maison/src/components/reels/CreateOrphanReelClient.tsx), so
 * the existing `transcodeReelVideo` Storage trigger picks it up unchanged.
 * The reel lands `moderationStatus: 'PENDING'` like any other reel — no
 * moderation bypass for admin-imported content.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as {
    announcerUid?: unknown;
    reels?: unknown;
  } | null;

  const announcerUid = typeof body?.announcerUid === "string" ? body.announcerUid.trim() : "";
  const items = Array.isArray(body?.reels) ? (body.reels as Array<Record<string, unknown>>) : [];

  if (!announcerUid) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Annonceur requis." }, 400, auth.correlationId);
  }
  if (items.length === 0 || items.length > MAX_REELS) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: `Fournir entre 1 et ${MAX_REELS} reels.` },
      400,
      auth.correlationId,
    );
  }

  const announcer = await findPlatformUserByUid(announcerUid);
  if (!announcer) {
    return jsonError({ code: "NOT_FOUND", message: "Annonceur introuvable." }, 404, auth.correlationId);
  }
  if (!announcer.roles.some((role) => role.trim().toLowerCase() === "announcer")) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Le compte ciblé n'a pas le rôle annonceur." },
      400,
      auth.correlationId,
    );
  }

  const db = getFirebaseAdminDb();
  const bucket = getFirebaseAdminStorage().bucket();
  const reelsCollection = db.collection(COLLECTIONS.reels);
  const results: ReelResult[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const videoUrl = typeof item.videoUrl === "string" ? item.videoUrl.trim() : "";
    const contact = typeof item.contact === "string" ? item.contact.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";

    if (!videoUrl) {
      results.push({ index, ok: false, error: "URL vidéo manquante." });
      continue;
    }

    const reelId = randomUUID();
    const rawVideoPath = `reels-raw/${announcerUid}/${reelId}.mp4`;
    let docCreated = false;

    try {
      // The Firestore doc MUST exist before the raw video lands on Storage —
      // evaluateReelProcessingClaim (functions/src/reels/transcode.ts) deletes
      // any upload whose reel doc it can't find, exactly as it would for a
      // real announcer upload racing the request.
      await reelsCollection.doc(reelId).create({
        propertyId: null,
        createdBy: announcerUid,
        processingStatus: "uploading",
        rawVideoPath,
        moderationStatus: "PENDING",
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        giftCount: 0,
        giftTotalAmount: 0,
        state: "IN_PROGRESS",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(contact ? { contact } : {}),
        ...(description ? { description } : {}),
      });
      docCreated = true;

      const download = await downloadRemoteFile(videoUrl, {
        maxBytes: MAX_VIDEO_BYTES,
        timeoutMs: DOWNLOAD_TIMEOUT_MS,
      });
      if (download.status < 200 || download.status >= 300) {
        throw new Error(`download HTTP ${download.status}`);
      }
      if (download.buffer.length === 0 || download.buffer.length > MAX_VIDEO_BYTES) {
        throw new Error(`size ${download.buffer.length}`);
      }

      await bucket.file(rawVideoPath).save(download.buffer, {
        resumable: false,
        contentType: "video/mp4",
        metadata: { metadata: { uploader: "apify_import", uploaderUid: auth.admin.uid } },
      });

      results.push({ index, ok: true, reelId });
    } catch (cause) {
      // The video never made it to Storage — drop the "uploading" doc rather
      // than leave a reel stuck forever with no video coming.
      if (docCreated) {
        await reelsCollection.doc(reelId).delete().catch(() => undefined);
      }
      results.push({ index, ok: false, error: `Échec vidéo : ${errorDetail(cause)}` });
    }
  }

  const created = results.filter((result) => result.ok).length;

  await logAudit({
    actorId: auth.admin.uid,
    actorRoles: auth.admin.roles,
    action: "reels.create",
    resource: "apify_import",
    resourceId: announcerUid,
    status: created > 0 ? "success" : "failed",
    correlationId: auth.correlationId,
    details: { announcerUid, total: items.length, created },
  });

  return jsonSuccess({ results, created, failed: items.length - created }, auth.correlationId, 201);
}

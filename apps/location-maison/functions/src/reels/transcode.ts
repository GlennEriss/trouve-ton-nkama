import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions/v2';
import ffmpeg from 'fluent-ffmpeg';
import { getStorage } from 'firebase-admin/storage';
import { admin, adminDB } from '../admin';
import {
  REELS_RAW_PREFIX,
  REEL_MAX_DURATION_SECONDS,
  REEL_MAX_HEIGHT_PX,
  REEL_VIDEO_BITRATE,
  REEL_THUMBNAIL_TIMESTAMP_SECONDS,
  TRANSCODE_FUNCTION_OPTIONS,
} from './config';

const REELS_COLLECTION = 'reels';

function resolveInstallerPath(packageName: string): string | null {
  try {
    const installer = require(packageName) as { path?: string };
    return typeof installer.path === 'string' ? installer.path : null;
  } catch (error) {
    logger.warn('Optional ffmpeg installer package could not be resolved during startup', {
      packageName,
      error: serializeError(error),
    });
    return null;
  }
}

function configureFfmpegBinaries(): void {
  const ffmpegPath = resolveInstallerPath('@ffmpeg-installer/ffmpeg');
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  } else {
    logger.warn('ffmpeg installer binary not found during startup; relying on runtime PATH', {
      ffmpegPath,
    });
  }

  const ffprobePath = resolveInstallerPath('@ffprobe-installer/ffprobe');
  if (ffprobePath && fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
  } else {
    logger.warn('ffprobe installer binary not found during startup; relying on runtime PATH', {
      ffprobePath,
    });
  }
}

function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      const duration = data?.format?.duration;
      if (typeof duration !== 'number' || !Number.isFinite(duration)) {
        reject(new Error('Durée de la vidéo illisible (ffprobe).'));
        return;
      }
      resolve(duration);
    });
  });
}

configureFfmpegBinaries();

function transcodeToMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoFilters(`scale='if(gt(ih,${REEL_MAX_HEIGHT_PX}),-2,iw)':'if(gt(ih,${REEL_MAX_HEIGHT_PX}),${REEL_MAX_HEIGHT_PX},ih)'`)
      .videoBitrate(REEL_VIDEO_BITRATE)
      .outputOptions(['-movflags +faststart', '-preset veryfast'])
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .save(outputPath);
  });
}

function extractThumbnail(inputPath: string, outputPath: string, timestampSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(timestampSeconds)
      .frames(1)
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .save(outputPath);
  });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const maybeNodeError = error as NodeJS.ErrnoException;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: maybeNodeError.code,
      errno: maybeNodeError.errno,
      syscall: maybeNodeError.syscall,
      path: maybeNodeError.path,
    };
  }

  return { value: String(error) };
}

async function tryExtractThumbnail({
  inputPath,
  outputPath,
  durationSeconds,
  filePath,
  reelId,
}: {
  inputPath: string;
  outputPath: string;
  durationSeconds: number;
  filePath: string;
  reelId: string;
}): Promise<boolean> {
  const timestampSeconds = Math.min(
    REEL_THUMBNAIL_TIMESTAMP_SECONDS,
    Math.max(0, durationSeconds - 0.25)
  );

  try {
    await extractThumbnail(inputPath, outputPath, timestampSeconds);
    if (await fileExists(outputPath)) {
      return true;
    }

    logger.warn('Reel thumbnail was not generated; continuing without thumbnail', {
      filePath,
      reelId,
      timestampSeconds,
      durationSeconds,
    });
    return false;
  } catch (error) {
    logger.warn('Reel thumbnail extraction failed; continuing without thumbnail', {
      error: serializeError(error),
      filePath,
      reelId,
      timestampSeconds,
      durationSeconds,
    });
    return false;
  }
}

function cleanupTmpFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    fs.promises.unlink(filePath).catch(() => undefined);
  }
}

/**
 * Parse "reels-raw/{ownerId}/{reelId}.{ext}" → { ownerId, reelId }. `reelId` est généré côté
 * client (crypto.randomUUID()) et sert à la fois d'id du doc Firestore et de nom de fichier
 * Storage — voir apps/location-maison/src/db/reel.db.ts.
 */
function parseRawVideoPath(filePath: string): { ownerId: string; reelId: string } | null {
  const parts = filePath.split('/');
  if (parts.length !== 3) return null;
  const [, ownerId, fileNameWithExt] = parts;
  const reelId = path.basename(fileNameWithExt, path.extname(fileNameWithExt));
  if (!ownerId || !reelId) return null;
  return { ownerId, reelId };
}

/**
 * Premier trigger Storage de ce repo (jusqu'ici uniquement des triggers Firestore v1 et
 * HTTPS/scheduler v2) — transcode la vidéo brute uploadée par l'annonceur (H.264 MP4, hauteur
 * plafonnée, bitrate raisonnable) et génère une miniature, sans dépendre d'un service tiers
 * payant (Mux/Cloudflare Stream écartés, voir docs/reels-cadeaux-abonnement.md).
 */
export const transcodeReelVideo = onObjectFinalized(TRANSCODE_FUNCTION_OPTIONS, async (event) => {
  const filePath = event.data.name;
  if (!filePath || !filePath.startsWith(REELS_RAW_PREFIX)) {
    return;
  }

  const parsed = parseRawVideoPath(filePath);
  if (!parsed) {
    logger.error('Reel raw video path could not be parsed', { filePath });
    return;
  }
  const { ownerId, reelId } = parsed;

  const reelRef = adminDB.collection(REELS_COLLECTION).doc(reelId);
  const reelSnap = await reelRef.get();
  if (!reelSnap.exists) {
    logger.error('Reel document not found for uploaded video', { filePath, reelId });
    return;
  }

  const bucket = getStorage().bucket(event.data.bucket);
  const workDir = path.join(os.tmpdir(), `reel-${reelId}-${randomUUID()}`);
  await fs.promises.mkdir(workDir, { recursive: true });

  const rawExtension = path.extname(filePath) || '.mp4';
  const tmpRawPath = path.join(workDir, `raw${rawExtension}`);
  const tmpOutPath = path.join(workDir, 'output.mp4');
  const tmpThumbPath = path.join(workDir, 'thumbnail.jpg');

  try {
    await reelRef.update({
      processingStatus: 'processing',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await bucket.file(filePath).download({ destination: tmpRawPath });

    const durationSeconds = await probeDurationSeconds(tmpRawPath);
    if (durationSeconds > REEL_MAX_DURATION_SECONDS) {
      await reelRef.update({
        processingStatus: 'failed',
        processingError: `Vidéo trop longue (${Math.round(durationSeconds)}s, maximum ${REEL_MAX_DURATION_SECONDS}s).`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await bucket.file(filePath).delete().catch(() => undefined);
      return;
    }

    await transcodeToMp4(tmpRawPath, tmpOutPath);
    const hasThumbnail = await tryExtractThumbnail({
      inputPath: tmpOutPath,
      outputPath: tmpThumbPath,
      durationSeconds,
      filePath,
      reelId,
    });

    const videoDestPath = `reels/${ownerId}/${reelId}/video.mp4`;
    const thumbDestPath = `reels/${ownerId}/${reelId}/thumbnail.jpg`;

    // bucket.file(...).publicUrl() génère une URL storage.googleapis.com brute — ce chemin
    // est régi par l'IAM Google Cloud, PAS par firestore/storage.rules (constaté en prod :
    // 403 "Anonymous caller does not have storage.objects.get access" malgré `allow read: if
    // true` sur ce chemin dans storage.rules). Il faut l'URL de téléchargement au format
    // Firebase (firebasestorage.googleapis.com/.../o/...?alt=media&token=...), le même que
    // génère getDownloadURL() côté client (file.db.ts) — c'est ce format qui respecte les
    // règles Storage.
    const videoToken = randomUUID();
    const thumbToken = randomUUID();

    await bucket.upload(tmpOutPath, {
      destination: videoDestPath,
      metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: videoToken } },
    });
    if (hasThumbnail) {
      await bucket.upload(tmpThumbPath, {
        destination: thumbDestPath,
        metadata: { contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: thumbToken } },
      });
    }

    const videoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(videoDestPath)}?alt=media&token=${videoToken}`;
    const thumbnailUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(thumbDestPath)}?alt=media&token=${thumbToken}`;

    await reelRef.update({
      videoUrl,
      videoPath: videoDestPath,
      durationSeconds,
      processingStatus: 'ready',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(hasThumbnail ? { thumbnailUrl, thumbnailPath: thumbDestPath } : {}),
    });

    await bucket.file(filePath).delete().catch(() => undefined);
  } catch (error) {
    logger.error('Reel transcoding failed', { error: serializeError(error), filePath, reelId });
    await reelRef.update({
      processingStatus: 'failed',
      processingError: "Le traitement de la vidéo a échoué. Réessayez avec un autre fichier.",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => undefined);
  } finally {
    cleanupTmpFiles([tmpRawPath, tmpOutPath, tmpThumbPath]);
    await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
});

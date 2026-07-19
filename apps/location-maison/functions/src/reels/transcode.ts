import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import '../node/slow-buffer-compat';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions/v2';
import ffmpeg from 'fluent-ffmpeg';
import { getStorage } from 'firebase-admin/storage';
import { admin, adminDB } from '../admin';
import { buildFunctionIncidentContext } from '../observability';
import {
  REELS_RAW_PREFIX,
  REEL_MAX_DURATION_SECONDS,
  REEL_MAX_HEIGHT_PX,
  REEL_VIDEO_BITRATE,
  REEL_THUMBNAIL_TIMESTAMP_SECONDS,
  TRANSCODE_FUNCTION_OPTIONS,
} from './config';

const REELS_COLLECTION = 'reels';

type VideoMetadata = {
  durationSeconds: number;
  videoCodec: string | null;
  audioCodec: string | null;
  height: number | null;
};

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

function probeVideoMetadata(filePath: string): Promise<VideoMetadata> {
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

      const videoStream = data.streams?.find((stream) => stream.codec_type === 'video');
      const audioStream = data.streams?.find((stream) => stream.codec_type === 'audio');
      resolve({
        durationSeconds: duration,
        videoCodec: videoStream?.codec_name ?? null,
        audioCodec: audioStream?.codec_name ?? null,
        height: typeof videoStream?.height === 'number' ? videoStream.height : null,
      });
    });
  });
}

configureFfmpegBinaries();

function withFfmpegOutput(error: Error, stdout: string | null | undefined, stderr: string | null | undefined): Error {
  const detailedError = error as Error & { stdout?: string; stderr?: string };
  detailedError.stdout = stdout ?? undefined;
  detailedError.stderr = stderr ?? undefined;
  return detailedError;
}

type TrimOptions = {
  trimStartSeconds: number;
  trimDurationSeconds: number;
  muted: boolean;
};

function applyTrimOptions(command: ffmpeg.FfmpegCommand, trim: TrimOptions | null): void {
  if (!trim) return;
  if (trim.trimStartSeconds > 0) {
    command.seekInput(trim.trimStartSeconds);
  }
  command.duration(trim.trimDurationSeconds);
}

// Coupe le son demandée à l'envoi (WhatsApp-like) — appliquée à l'encodage final, pas
// seulement à l'aperçu client (voir CreateOrphanReelClient.tsx).
function audioOutputOptions(muted: boolean): string[] {
  return muted ? ['-an'] : [];
}

function remuxToMp4(inputPath: string, outputPath: string, trim: TrimOptions | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);
    applyTrimOptions(command, trim);
    command
      .outputOptions([
        '-map 0:v:0',
        ...(trim?.muted ? [] : ['-map 0:a:0?']),
        '-c:v copy',
        ...(trim?.muted ? [] : ['-c:a copy']),
        ...audioOutputOptions(Boolean(trim?.muted)),
        '-movflags +faststart',
      ])
      .on('end', () => resolve())
      .on('error', (error, stdout, stderr) => reject(withFfmpegOutput(error, stdout, stderr)))
      .save(outputPath);
  });
}

function encodeToMp4(inputPath: string, outputPath: string, trim: TrimOptions | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);
    applyTrimOptions(command, trim);
    command
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoFilters(`scale='if(gt(ih,${REEL_MAX_HEIGHT_PX}),-2,iw)':'if(gt(ih,${REEL_MAX_HEIGHT_PX}),${REEL_MAX_HEIGHT_PX},ih)'`)
      .videoBitrate(REEL_VIDEO_BITRATE)
      .outputOptions(['-movflags +faststart', '-preset veryfast', ...audioOutputOptions(Boolean(trim?.muted))])
      .on('end', () => resolve())
      .on('error', (error, stdout, stderr) => reject(withFfmpegOutput(error, stdout, stderr)))
      .save(outputPath);
  });
}

function canRemuxToMp4(metadata: VideoMetadata): boolean {
  const compatibleVideo = metadata.videoCodec === 'h264';
  const compatibleAudio = metadata.audioCodec === null || metadata.audioCodec === 'aac';
  const withinHeightLimit = metadata.height === null || metadata.height <= REEL_MAX_HEIGHT_PX;

  return compatibleVideo && compatibleAudio && withinHeightLimit;
}

async function transcodeToMp4(
  inputPath: string,
  outputPath: string,
  metadata: VideoMetadata,
  trim: TrimOptions | null
): Promise<void> {
  if (canRemuxToMp4(metadata)) {
    try {
      await remuxToMp4(inputPath, outputPath, trim);
      return;
    } catch (error) {
      logger.warn('Compatible reel remux failed; falling back to video encoding', {
        error: serializeError(error),
        metadata,
      });
    }
  }

  await encodeToMp4(inputPath, outputPath, trim);
}

function extractThumbnail(inputPath: string, outputPath: string, timestampSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(timestampSeconds)
      .frames(1)
      .on('end', () => resolve())
      .on('error', (error, stdout, stderr) => reject(withFfmpegOutput(error, stdout, stderr)))
      .save(outputPath);
  });
}

function truncateLogValue(value: unknown): unknown {
  if (typeof value !== 'string' || value.length <= 4000) {
    return value;
  }

  return `${value.slice(0, 4000)}... [truncated]`;
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
    const maybeFfmpegError = error as Error & { stdout?: string; stderr?: string };
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: maybeNodeError.code,
      errno: maybeNodeError.errno,
      syscall: maybeNodeError.syscall,
      path: maybeNodeError.path,
      stdout: truncateLogValue(maybeFfmpegError.stdout),
      stderr: truncateLogValue(maybeFfmpegError.stderr),
    };
  }

  return { value: String(error) };
}

async function tryExtractThumbnail({
  inputPath,
  outputPath,
  durationSeconds,
  reelId,
}: {
  inputPath: string;
  outputPath: string;
  durationSeconds: number;
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
      reelId,
      timestampSeconds,
      durationSeconds,
    });
    return false;
  } catch (error) {
    logger.warn('Reel thumbnail extraction failed; continuing without thumbnail', {
      error: serializeError(error),
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
    logger.error('Reel raw video path could not be parsed', {
      ...buildFunctionIncidentContext({
        category: 'reel_processing',
        operation: 'reel.transcode',
        incidentCode: 'INVALID_STORAGE_PATH',
        retryable: false,
        eventId: event.id,
      }),
      objectNameLength: filePath.length,
    });
    return;
  }
  const { ownerId, reelId } = parsed;
  const incidentContext = buildFunctionIncidentContext({
    category: 'reel_processing',
    operation: 'reel.transcode',
    eventId: event.id,
    reelId,
  });

  const reelRef = adminDB.collection(REELS_COLLECTION).doc(reelId);
  const reelSnap = await reelRef.get();
  if (!reelSnap.exists) {
    logger.error('Reel document not found for uploaded video', {
      ...incidentContext,
      incidentCode: 'REEL_NOT_FOUND',
      retryable: false,
    });
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

    const metadata = await probeVideoMetadata(tmpRawPath);
    const { durationSeconds: rawDurationSeconds } = metadata;
    const reelData = reelSnap.data() ?? {};
    const requestedTrimStart = typeof reelData.trimStartSeconds === 'number' ? reelData.trimStartSeconds : 0;
    const requestedTrimEnd = typeof reelData.trimEndSeconds === 'number' ? reelData.trimEndSeconds : rawDurationSeconds;
    // Bornes défensives : le client envoie déjà des valeurs cohérentes (voir CreateOrphanReelClient.tsx
    // + validation API /api/reels), mais on ne fait jamais confiance à la durée probée côté client.
    const trimStartSeconds = Math.max(0, Math.min(requestedTrimStart, rawDurationSeconds));
    const trimEndSeconds = Math.max(trimStartSeconds, Math.min(requestedTrimEnd, rawDurationSeconds));
    const isTrimmed = trimStartSeconds > 0 || trimEndSeconds < rawDurationSeconds;
    const durationSeconds = isTrimmed ? trimEndSeconds - trimStartSeconds : rawDurationSeconds;
    const muted = Boolean(reelData.muted);

    if (durationSeconds > REEL_MAX_DURATION_SECONDS) {
      logger.warn('Reel duration exceeds configured limit', {
        ...incidentContext,
        incidentCode: 'VIDEO_TOO_LONG',
        retryable: false,
        durationSeconds: Math.round(durationSeconds),
        maxDurationSeconds: REEL_MAX_DURATION_SECONDS,
      });
      await reelRef.update({
        processingStatus: 'failed',
        processingError: `Vidéo trop longue (${Math.round(durationSeconds)}s, maximum ${REEL_MAX_DURATION_SECONDS}s).`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await bucket.file(filePath).delete().catch(() => undefined);
      return;
    }

    const trimOptions = isTrimmed || muted
      ? { trimStartSeconds, trimDurationSeconds: durationSeconds, muted }
      : null;

    await transcodeToMp4(tmpRawPath, tmpOutPath, metadata, trimOptions);
    const hasThumbnail = await tryExtractThumbnail({
      inputPath: tmpOutPath,
      outputPath: tmpThumbPath,
      durationSeconds,
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

    // Sans cacheControl explicite, GCS/Firebase Storage sert `private, max-age=0` par défaut :
    // le navigateur doit revalider (donc réseau) à CHAQUE lecture, même en revenant sur un réel
    // déjà vu dans le fil pendant la même session — c'est ça qui donne l'impression que la
    // vidéo "recharge". Le chemin de sortie (reels/{owner}/{reelId}/video.mp4) n'est jamais
    // réécrit après transcodage (un réel ready n'est pas re-transcodé) : le contenu est
    // immuable, donc un cache long + immutable est sûr.
    const longLivedCacheControl = 'public, max-age=31536000, immutable';

    await bucket.upload(tmpOutPath, {
      destination: videoDestPath,
      metadata: {
        contentType: 'video/mp4',
        cacheControl: longLivedCacheControl,
        metadata: { firebaseStorageDownloadTokens: videoToken },
      },
    });
    if (hasThumbnail) {
      await bucket.upload(tmpThumbPath, {
        destination: thumbDestPath,
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: longLivedCacheControl,
          metadata: { firebaseStorageDownloadTokens: thumbToken },
        },
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
    logger.info('Reel transcoding completed', {
      ...incidentContext,
      durationSeconds,
      hasThumbnail,
      outputCodec: 'h264',
    });
  } catch (error) {
    logger.error('Reel transcoding failed', {
      ...incidentContext,
      incidentCode: 'REEL_TRANSCODE_FAILED',
      retryable: true,
      error: serializeError(error),
    });
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

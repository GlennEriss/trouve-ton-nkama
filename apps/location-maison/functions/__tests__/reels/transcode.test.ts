import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import type { VideoMetadata } from '../../src/reels/transcode';

process.env.GCLOUD_PROJECT = 'location-maison-test';
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'location-maison-test',
  storageBucket: 'location-maison-test.appspot.com',
});

const {
  buildReelProcessingPlan,
  canRemuxToMp4,
  evaluateReelProcessingClaim,
  isActiveProcessingGeneration,
  parseRawVideoPath,
  probeVideoMetadata,
  transcodeToMp4,
  tryExtractThumbnail,
} = require('../../src/reels/transcode') as typeof import('../../src/reels/transcode');

const execFileAsync = promisify(execFile);
const ffmpegPath = (require('@ffmpeg-installer/ffmpeg') as { path: string }).path;

jest.setTimeout(60_000);

const compatibleMetadata: VideoMetadata = {
  durationSeconds: 12,
  videoCodec: 'h264',
  audioCodec: 'aac',
  height: 1080,
};

describe('reel transcoding contracts', () => {
  it('parse uniquement le chemin brut owner/reel attendu', () => {
    expect(parseRawVideoPath('reels-raw/owner-1/reel-1.mov')).toEqual({
      ownerId: 'owner-1',
      reelId: 'reel-1',
    });
    expect(parseRawVideoPath('reels-raw/owner-1/nested/reel-1.mov')).toBeNull();
    expect(parseRawVideoPath('reels-raw//reel-1.mov')).toBeNull();
  });

  it('autorise un seul claim coherent avec le document Firestore', () => {
    const reel = {
      createdBy: 'owner-1',
      rawVideoPath: 'reels-raw/owner-1/reel-1.mov',
      processingStatus: 'uploading',
    };

    expect(evaluateReelProcessingClaim(reel, 'owner-1', reel.rawVideoPath)).toEqual({
      allowed: true,
    });
    expect(evaluateReelProcessingClaim(reel, 'owner-2', reel.rawVideoPath)).toEqual({
      allowed: false,
      reason: 'OWNER_MISMATCH',
    });
    expect(evaluateReelProcessingClaim(reel, 'owner-1', 'reels-raw/owner-1/other.mov')).toEqual({
      allowed: false,
      reason: 'RAW_PATH_MISMATCH',
    });
    expect(evaluateReelProcessingClaim({ ...reel, processingStatus: 'processing' }, 'owner-1', reel.rawVideoPath)).toEqual({
      allowed: false,
      reason: 'ALREADY_CLAIMED',
    });
    expect(evaluateReelProcessingClaim({ ...reel, processingStatus: 'ready' }, 'owner-1', reel.rawVideoPath)).toEqual({
      allowed: false,
      reason: 'ALREADY_CLAIMED',
    });
  });

  it('calcule la decoupe et le son coupe sans depasser la source', () => {
    expect(buildReelProcessingPlan(compatibleMetadata, {})).toEqual({
      ok: true,
      durationSeconds: 12,
      trimOptions: null,
    });
    expect(buildReelProcessingPlan(compatibleMetadata, {
      trimStartSeconds: 2,
      trimEndSeconds: 8,
      muted: true,
    })).toEqual({
      ok: true,
      durationSeconds: 6,
      trimOptions: {
        trimStartSeconds: 2,
        trimDurationSeconds: 6,
        muted: true,
      },
    });
  });

  it('distingue la generation active d un nouvel upload au meme chemin', () => {
    expect(isActiveProcessingGeneration('processing', 123, 123)).toBe(true);
    expect(isActiveProcessingGeneration('processing', '123', 123)).toBe(true);
    expect(isActiveProcessingGeneration('processing', 122, 123)).toBe(false);
    expect(isActiveProcessingGeneration('ready', 123, 123)).toBe(false);
  });

  it('rejette une decoupe vide et une video de plus de cinq minutes', () => {
    expect(buildReelProcessingPlan(compatibleMetadata, {
      trimStartSeconds: 99,
    })).toEqual(expect.objectContaining({
      ok: false,
      incidentCode: 'INVALID_TRIM_RANGE',
      durationSeconds: 0,
    }));
    expect(buildReelProcessingPlan({ ...compatibleMetadata, durationSeconds: 301 }, {})).toEqual(
      expect.objectContaining({
        ok: false,
        incidentCode: 'VIDEO_TOO_LONG',
        durationSeconds: 301,
      }),
    );
  });

  it('reserve le remux aux videos H264/AAC sous la hauteur maximale', () => {
    expect(canRemuxToMp4(compatibleMetadata)).toBe(true);
    expect(canRemuxToMp4({ ...compatibleMetadata, videoCodec: 'hevc' })).toBe(false);
    expect(canRemuxToMp4({ ...compatibleMetadata, audioCodec: 'mp3' })).toBe(false);
    expect(canRemuxToMp4({ ...compatibleMetadata, height: 2160 })).toBe(false);
    expect(canRemuxToMp4({ ...compatibleMetadata, audioCodec: null })).toBe(true);
  });
});

describe('reel transcoding with real ffmpeg binaries', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lot8c-ffmpeg-'));
  });

  afterEach(async () => {
    await fs.promises.rm(workDir, { recursive: true, force: true });
  });

  it('produit un MP4 lisible, muet et une miniature depuis une vraie video', async () => {
    const sourcePath = path.join(workDir, 'source.mp4');
    const outputPath = path.join(workDir, 'output.mp4');
    const thumbnailPath = path.join(workDir, 'thumbnail.jpg');

    await execFileAsync(ffmpegPath, [
      '-hide_banner',
      '-loglevel', 'error',
      '-f', 'lavfi',
      '-i', 'color=c=0x146b67:s=360x640:r=24:d=2',
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:duration=2',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      sourcePath,
    ]);

    const sourceMetadata = await probeVideoMetadata(sourcePath);
    expect(canRemuxToMp4(sourceMetadata)).toBe(true);

    await transcodeToMp4(sourcePath, outputPath, sourceMetadata, {
      trimStartSeconds: 0.25,
      trimDurationSeconds: 1,
      muted: true,
    });
    const outputMetadata = await probeVideoMetadata(outputPath);
    expect(outputMetadata.videoCodec).toBe('h264');
    expect(outputMetadata.audioCodec).toBeNull();
    expect(outputMetadata.durationSeconds).toBeGreaterThan(0.7);
    expect(outputMetadata.durationSeconds).toBeLessThan(1.4);

    await expect(tryExtractThumbnail({
      inputPath: outputPath,
      outputPath: thumbnailPath,
      durationSeconds: outputMetadata.durationSeconds,
      reelId: 'lot8c-local',
    })).resolves.toBe(true);
    expect((await fs.promises.stat(thumbnailPath)).size).toBeGreaterThan(0);
  });

  it('reencode un MOV MPEG4/PCM incompatible en H264/AAC', async () => {
    const sourcePath = path.join(workDir, 'source.mov');
    const outputPath = path.join(workDir, 'output.mp4');

    await execFileAsync(ffmpegPath, [
      '-hide_banner',
      '-loglevel', 'error',
      '-f', 'lavfi',
      '-i', 'testsrc2=s=360x640:r=24:d=2',
      '-f', 'lavfi',
      '-i', 'sine=frequency=660:duration=2',
      '-c:v', 'mpeg4',
      '-q:v', '5',
      '-c:a', 'pcm_s16le',
      '-shortest',
      sourcePath,
    ]);

    const sourceMetadata = await probeVideoMetadata(sourcePath);
    expect(sourceMetadata).toEqual(expect.objectContaining({
      videoCodec: 'mpeg4',
      audioCodec: 'pcm_s16le',
    }));
    expect(canRemuxToMp4(sourceMetadata)).toBe(false);

    await transcodeToMp4(sourcePath, outputPath, sourceMetadata, null);
    await expect(probeVideoMetadata(outputPath)).resolves.toEqual(expect.objectContaining({
      videoCodec: 'h264',
      audioCodec: 'aac',
      height: 640,
    }));
  });
});

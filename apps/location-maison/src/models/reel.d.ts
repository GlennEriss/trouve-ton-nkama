/**
 * @module reel
 */
import { ICreation } from "./creation";
import type { ModerationStatus } from "./annonce";

export type ReelProcessingStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export type Reel = ICreation & {
    propertyId: string;
    createdBy: string;

    processingStatus: ReelProcessingStatus;
    processingError?: string;
    rawVideoPath: string;

    videoUrl?: string;
    videoPath?: string;
    thumbnailUrl?: string;
    thumbnailPath?: string;
    durationSeconds?: number;

    moderationStatus: ModerationStatus;
    rejectionReason?: string;
    moderationReviewedAt?: import("firebase/firestore").Timestamp;
    moderationReviewedBy?: string;

    viewCount: number;
    giftCount: number;
    giftTotalAmount: number;
}

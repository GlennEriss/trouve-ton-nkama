export type ReelProcessingStatus = "uploading" | "processing" | "ready" | "failed";
export type ReelModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Forme brute du document Firestore `reels/{reelId}` — voir apps/location-maison/src/models/reel.d.ts. */
export type ReelRawDoc = {
  propertyId: string;
  createdBy: string;
  processingStatus: ReelProcessingStatus;
  processingError?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  moderationStatus: ReelModerationStatus;
  rejectionReason?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ReelListItem = {
  id: string;
  propertyId: string;
  createdBy: string;
  processingStatus: ReelProcessingStatus;
  processingError: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  moderationStatus: ReelModerationStatus;
  rejectionReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

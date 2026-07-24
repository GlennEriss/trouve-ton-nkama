export type ListingClaimReviewStatus = "pending" | "approved" | "rejected";

export type ListingClaimReview = {
  id: string;
  uid: string;
  verifiedPhone: string;
  matchCount: number;
  status: ListingClaimReviewStatus;
  createdAt: string | null;
  lastAttemptAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  /** Announcer's display name/email when resolvable, for admin readability. */
  announcerLabel: string | null;
};

export type SocialImportPlatform = "facebook" | "instagram" | "tiktok" | "linkedin" | "x";

export type SocialImportSourceType = "profile" | "page" | "group_user";

export type SocialImportSourceStatus = "active" | "paused" | "revoked";

export type SocialImportJobStatus =
  | "running"
  | "completed"
  | "failed"
  | "partial"
  | "needs_review";

export type SocialImportDecisionType =
  | "publish"
  | "reject"
  | "archive_duplicate"
  | "retry";

export type SocialImportMode = "manual" | "scheduled";

export type SocialImportEnvironment = "dev" | "preprod" | "prod";

export type SocialImportSource = {
  id: string;
  announcerUid: string;
  platform: SocialImportPlatform;
  sourceUrl: string;
  sourceType: SocialImportSourceType;
  status: SocialImportSourceStatus;
  consent: {
    grantedAt: string | null;
    grantedBy: string | null;
    proofRef: string | null;
    expiresAt: string | null;
  };
  lastImportAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SocialImportSourceStatusFilter = "all" | SocialImportSourceStatus;

export type ListSocialImportSourcesInput = {
  limit: number;
  cursor?: string | null;
  announcerUid?: string;
  platform?: SocialImportPlatform;
  status?: SocialImportSourceStatusFilter;
  query?: string;
};

export type ListSocialImportSourcesResult = {
  sources: SocialImportSource[];
  count: number;
  totalCount: number | null;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    announcerUid: string;
    platform: SocialImportPlatform | "all";
    status: SocialImportSourceStatusFilter;
    query: string;
    limit: number;
  };
};

export type SocialImportJobCounters = {
  rawFetched: number;
  normalizedOk: number;
  needsReview: number;
  published: number;
  rejected: number;
};

export type SocialImportJob = {
  id: string;
  status: SocialImportJobStatus;
  mode: SocialImportMode;
  environment: SocialImportEnvironment;
  announcerScope: string[];
  counters: SocialImportJobCounters;
  errorSummary: string | null;
  triggeredBy: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown> | null;
};

export type SocialImportJobStatusFilter = "all" | SocialImportJobStatus;

export type ListSocialImportJobsInput = {
  limit: number;
  cursor?: string | null;
  status?: SocialImportJobStatusFilter;
  announcerUid?: string;
  query?: string;
  startedFrom?: string;
  startedTo?: string;
};

export type ListSocialImportJobsResult = {
  jobs: SocialImportJob[];
  count: number;
  totalCount: number | null;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    status: SocialImportJobStatusFilter;
    announcerUid: string;
    query: string;
    startedFrom: string;
    startedTo: string;
    limit: number;
  };
};

export type SocialImportReviewCandidateStatus =
  | "ready_to_publish"
  | "needs_review"
  | "rejected"
  | "published";

export type SocialImportReviewCandidate = {
  id: string;
  jobId: string | null;
  announcerUid: string;
  sourceId: string | null;
  rawPostId: string;
  sourcePostUrl: string | null;
  sourcePublishedAt: string | null;
  rawJsonPath: string | null;
  rawJsonBucket: string | null;
  rawJsonGsUri: string | null;
  rawJsonSizeBytes: number | null;
  title: string | null;
  typeProperty: string | null;
  price: number | null;
  city: string | null;
  province: string | null;
  imageUrls: string[];
  listing: Record<string, unknown> | null;
  status: SocialImportReviewCandidateStatus;
  autoReason: string | null;
  score: number | null;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedPropertyId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SocialImportReviewStatusFilter = "all" | SocialImportReviewCandidateStatus;

export type ListSocialImportReviewInput = {
  limit: number;
  cursor?: string | null;
  status?: SocialImportReviewStatusFilter;
  announcerUid?: string;
  query?: string;
};

export type ListSocialImportReviewResult = {
  candidates: SocialImportReviewCandidate[];
  count: number;
  totalCount: number | null;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    status: SocialImportReviewStatusFilter;
    announcerUid: string;
    query: string;
    limit: number;
  };
};

export type SocialImportDecision = {
  id: string;
  jobId: string | null;
  announcerUid: string | null;
  rawPostId: string | null;
  decision: SocialImportDecisionType;
  reason: string | null;
  actorId: string | null;
  createdAt: string | null;
};

export type SocialImportDecisionFilter = "all" | SocialImportDecisionType;

export type ListSocialImportDecisionsInput = {
  limit: number;
  cursor?: string | null;
  decision?: SocialImportDecisionFilter;
  jobId?: string;
  announcerUid?: string;
  query?: string;
};

export type ListSocialImportDecisionsResult = {
  decisions: SocialImportDecision[];
  count: number;
  totalCount: number | null;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    decision: SocialImportDecisionFilter;
    jobId: string;
    announcerUid: string;
    query: string;
    limit: number;
  };
};

export type SocialImportSchedulerEnvironment = "dev" | "preprod" | "prod";

export type SocialImportSettings = {
  id: string;
  thresholds: {
    autoPublishMinScore: number;
    autoRejectMaxScore: number;
    defaultRunLimit: number;
    maxRunLimit: number;
  };
  scheduler: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
    environment: SocialImportSchedulerEnvironment;
    includeImported: boolean;
    headless: boolean;
    defaultReason: string;
  };
  orchestrator: {
    executionMode: "local";
    orchestratorUrlConfigured: boolean;
    allowLocalProd: boolean;
  };
  updatedBy: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

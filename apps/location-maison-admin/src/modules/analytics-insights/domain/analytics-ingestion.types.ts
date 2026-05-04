import type {
  AnalyticsIngestionBody,
  AnalyticsIngestionSourceHeader,
  AnalyticsValidatedEvent,
  AnalyticsValidationIssue,
} from "@/modules/analytics-insights/domain/analytics-ingestion.schema";

export type AnalyticsIngestionHeaders = {
  correlationId: string;
  idempotencyKey: string;
  sourceHeader: AnalyticsIngestionSourceHeader;
  ingestedBy: string;
};

export type AnalyticsRejectedEvent = {
  eventId: string | null;
  eventName: string | null;
  source: string | null;
  environment: string | null;
  reasonCode: string;
  reasonMessage: string;
  issues: AnalyticsValidationIssue[];
  rawEvent: unknown;
};

export type AnalyticsIngestionSummary = {
  batchId: string;
  accepted: number;
  rejected: number;
  quarantined: number;
  replayed: boolean;
};

export type AnalyticsIngestionInput = {
  headers: AnalyticsIngestionHeaders;
  body: AnalyticsIngestionBody;
  payloadFingerprint: string;
};

export type AnalyticsIngestionPreparedData = {
  acceptedEvents: AnalyticsValidatedEvent[];
  rejectedEvents: AnalyticsRejectedEvent[];
};

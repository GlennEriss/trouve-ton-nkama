"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui-kit/page-header";

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type SourceItem = {
  id: string;
  announcerUid: string;
  platform: "facebook" | "instagram" | "tiktok" | "linkedin" | "x";
  sourceUrl: string;
  sourceType: "profile" | "page" | "group_user";
  status: "active" | "paused" | "revoked";
  lastImportAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SourcesPayload = {
  sources: SourceItem[];
  count: number;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type JobItem = {
  id: string;
  status: "running" | "completed" | "failed" | "partial" | "needs_review";
  mode: "manual" | "scheduled";
  environment: "dev" | "preprod" | "prod";
  announcerScope: string[];
  counters: {
    rawFetched: number;
    normalizedOk: number;
    needsReview: number;
    published: number;
    rejected: number;
  };
  errorSummary: string | null;
  triggeredBy: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown> | null;
};

type JobsPayload = {
  jobs: JobItem[];
  count: number;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type JsonImportPayload = {
  job: JobItem;
  replayed: boolean;
  importedCount: number;
};

type AutoFixCandidatesPayload = {
  requestedCount: number;
  correctedCount: number;
  stillNeedsReviewCount: number;
  skippedPublishedCount: number;
  skippedRejectedCount: number;
  notFoundCount: number;
};

type JobDetailsPayload = {
  job: JobItem;
};

type JobLogsPayload = {
  job: JobItem;
  logs: {
    cloudRun: null;
    orchestratorUrl: null;
    externalRunId: string | null;
    callbackIngestedAt?: string | null;
    hints: string[];
  };
};

type JobActionModalMode =
  | "details"
  | "logs"
  | "cancel";

type SocialImportActionModalMode =
  | "create_source"
  | "pause_source"
  | "revoke_source"
  | "edit_candidate_type"
  | "reject_candidate"
  | "publish_candidate"
  | "delete_candidate"
  | "delete_candidates_bulk";

type ReviewItem = {
  id: string;
  announcerUid: string;
  sourceId: string | null;
  rawPostId: string;
  sourcePostUrl: string | null;
  sourcePublishedAt: string | null;
  title: string | null;
  typeProperty: string | null;
  price: number | null;
  city: string | null;
  province: string | null;
  imageUrls: string[];
  listing: Record<string, unknown> | null;
  status: "ready_to_publish" | "needs_review" | "rejected" | "published";
  autoReason: string | null;
  score: number | null;
  createdAt: string | null;
};

type ReviewStatusFilter =
  | "all"
  | "open"
  | "processed"
  | ReviewItem["status"];

type ReviewPayload = {
  candidates: ReviewItem[];
  count: number;
};

type DecisionItem = {
  id: string;
  jobId: string | null;
  announcerUid: string | null;
  rawPostId: string | null;
  decision: "publish" | "reject" | "archive_duplicate" | "retry";
  reason: string | null;
  actorId: string | null;
  createdAt: string | null;
};

type DecisionsPayload = {
  decisions: DecisionItem[];
  count: number;
};

type AnnouncerLookupItem = {
  uid: string;
  fullName: string;
  email: string | null;
  phoneNumbers: string[];
};

type AnnouncerLookupPayload = {
  announcers: AnnouncerLookupItem[];
  count: number;
};

const LISTING_TYPE_OPTIONS = [
  "Home",
  "Studio",
  "Apartment",
  "Desk",
  "Building",
  "Shop",
  "Kiosk",
  "Room",
  "Property",
  "Logement",
  "Villa",
  "Land",
] as const;

type ListingTypeOption = (typeof LISTING_TYPE_OPTIONS)[number];
type ListingFieldSpec = {
  key: string;
  label: string;
};

const COMMON_LISTING_FIELDS: ListingFieldSpec[] = [
  { key: "typeProperty", label: "Type" },
  { key: "status", label: "Statut annonce" },
  { key: "title", label: "Titre" },
  { key: "tags", label: "Tags" },
  { key: "price", label: "Prix" },
  { key: "area", label: "Superficie (m²)" },
  { key: "street", label: "Quartier/Rue" },
  { key: "city", label: "Ville" },
  { key: "province", label: "Province" },
  { key: "country", label: "Pays" },
  { key: "countryCode", label: "Code pays" },
  { key: "images", label: "Images" },
];

const TYPE_LISTING_FIELDS: Record<ListingTypeOption, ListingFieldSpec[]> = {
  Logement: [
    { key: "nbrRooms", label: "Nombre de chambres" },
    { key: "nbrKitchens", label: "Nombre de cuisines" },
    { key: "nbrBathrooms", label: "Nombre de salles d'eau" },
    { key: "nbrToilets", label: "Nombre de toilettes" },
  ],
  Apartment: [
    { key: "nbrRooms", label: "Nombre de chambres" },
    { key: "nbrKitchens", label: "Nombre de cuisines" },
    { key: "nbrBathrooms", label: "Nombre de salles d'eau" },
    { key: "nbrToilets", label: "Nombre de toilettes" },
    { key: "nbrFloorApartment", label: "Étage appartement" },
    { key: "numeroApartment", label: "Numéro appartement" },
  ],
  Studio: [
    { key: "nbrRooms", label: "Nombre de pièces" },
    { key: "nbrKitchens", label: "Nombre de cuisines" },
    { key: "nbrBathrooms", label: "Nombre de salles d'eau" },
    { key: "nbrToilets", label: "Nombre de toilettes" },
    { key: "nbrFloorStudio", label: "Étage studio" },
    { key: "numeroStudio", label: "Numéro studio" },
  ],
  Home: [
    { key: "nbrRooms", label: "Nombre de chambres" },
    { key: "nbrKitchens", label: "Nombre de cuisines" },
    { key: "nbrBathrooms", label: "Nombre de salles d'eau" },
    { key: "nbrToilets", label: "Nombre de toilettes" },
    { key: "nbrGarages", label: "Nombre de garages" },
    { key: "nbrFloors", label: "Nombre d'étages" },
    { key: "nbrLivingRoom", label: "Nombre de salons" },
  ],
  Villa: [
    { key: "nbrRooms", label: "Nombre de chambres" },
    { key: "nbrKitchens", label: "Nombre de cuisines" },
    { key: "nbrBathrooms", label: "Nombre de salles d'eau" },
    { key: "nbrToilets", label: "Nombre de toilettes" },
    { key: "nbrGarages", label: "Nombre de garages" },
    { key: "nbrFloors", label: "Nombre d'étages" },
    { key: "nbrPiscine", label: "Nombre de piscines" },
  ],
  Desk: [
    { key: "nbrRooms", label: "Nombre de bureaux/pièces" },
    { key: "nbrToilets", label: "Nombre de toilettes" },
  ],
  Building: [
    { key: "nbrApartments", label: "Nombre d'appartements" },
    { key: "nbrFloors", label: "Nombre d'étages" },
    { key: "hasParking", label: "Parking" },
  ],
  Shop: [
    { key: "nbrRooms", label: "Nombre de pièces" },
    { key: "nbrToilet", label: "Nombre de toilettes" },
  ],
  Kiosk: [{ key: "kioskType", label: "Type de kiosque" }],
  Room: [{ key: "roomType", label: "Type de chambre" }],
  Property: [],
  Land: [],
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function toDateLabel(value: string | null | undefined) {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toStatusBadgeVariant(
  value: string | null | undefined,
): "neutral" | "success" | "warning" | "danger" {
  if (!value) {
    return "neutral";
  }
  if (
    value === "active" ||
    value === "completed" ||
    value === "ready_to_publish" ||
    value === "published" ||
    value === "publish"
  ) {
    return "success";
  }
  if (value === "needs_review" || value === "partial" || value === "paused" || value === "retry") {
    return "warning";
  }
  if (value === "failed" || value === "revoked" || value === "rejected" || value === "reject") {
    return "danger";
  }
  return "neutral";
}

function toReviewCandidateStatusLabel(status: ReviewItem["status"]) {
  if (status === "published") {
    return "production";
  }
  return status;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeListingType(value: string | null | undefined): ListingTypeOption {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    return "Property";
  }
  const found = LISTING_TYPE_OPTIONS.find((entry) => entry.toLowerCase() === normalized);
  return found ?? "Property";
}

function getCandidateFieldRawValue(candidate: ReviewItem, fieldKey: string): unknown {
  const listing = asRecord(candidate.listing);
  if (listing && fieldKey in listing) {
    return listing[fieldKey];
  }

  if (fieldKey === "typeProperty") return candidate.typeProperty;
  if (fieldKey === "price") return candidate.price;
  if (fieldKey === "city") return candidate.city;
  if (fieldKey === "province") return candidate.province;
  if (fieldKey === "images") return candidate.imageUrls;

  return undefined;
}

function isMissingFieldValue(fieldKey: string, value: unknown) {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (fieldKey === "images" && typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const images = Array.isArray(record.images) ? record.images : [];
    return images.length === 0;
  }
  return false;
}

function formatFieldValueForDisplay(fieldKey: string, value: unknown) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  if (fieldKey === "images") {
    const imageArray = Array.isArray(value) ? value : [];
    return `${imageArray.length} image(s)`;
  }

  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }

  if (typeof value === "number") {
    if (fieldKey === "price") {
      return `${formatNumber(value)} FCFA`;
    }
    return formatNumber(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : "N/A";
  }

  if (Array.isArray(value)) {
    if (fieldKey === "tags") {
      const tags = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
      return tags.length > 0 ? tags.join(", ") : "N/A";
    }
    return `${value.length} élément(s)`;
  }

  return "Renseigné";
}

function buildCandidateRequiredFields(candidate: ReviewItem) {
  const listing = asRecord(candidate.listing);
  const listingType = normalizeListingType(
    (typeof listing?.typeProperty === "string" ? listing.typeProperty : candidate.typeProperty) as
      | string
      | null
      | undefined,
  );
  const fieldSpecs = [...COMMON_LISTING_FIELDS, ...TYPE_LISTING_FIELDS[listingType]];
  const deduplicated = fieldSpecs.filter(
    (field, index) => fieldSpecs.findIndex((entry) => entry.key === field.key) === index,
  );
  const rows = deduplicated.map((field) => {
    const value = getCandidateFieldRawValue(candidate, field.key);
    return {
      ...field,
      value,
      missing: isMissingFieldValue(field.key, value),
    };
  });
  const missingCount = rows.filter((row) => row.missing).length;

  return {
    listingType,
    rows,
    missingCount,
    filledCount: rows.length - missingCount,
  };
}

function formatUnknownForDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "N/A";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function buildCandidateFullAttributes(candidate: ReviewItem | null) {
  if (!candidate) {
    return {} as Record<string, unknown>;
  }

  const listing = asRecord(candidate.listing);
  const baseAttributes: Record<string, unknown> = {
    sourcePostUrl: candidate.sourcePostUrl,
    sourcePublishedAt: candidate.sourcePublishedAt,
    rawPostId: candidate.rawPostId,
    announcerUid: candidate.announcerUid,
    statusReview: candidate.status,
    autoReason: candidate.autoReason,
    score: candidate.score,
  };

  if (!listing) {
    return {
      ...baseAttributes,
      typeProperty: candidate.typeProperty,
      title: candidate.title,
      price: candidate.price,
      city: candidate.city,
      province: candidate.province,
      imageUrls: candidate.imageUrls,
    };
  }

  return {
    ...listing,
    ...baseAttributes,
  };
}

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

export default function SocialImportDashboardPage() {
  const [queryDraft, setQueryDraft] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [limit, setLimit] = useState(20);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>("open");
  const [announcerLookupInput, setAnnouncerLookupInput] = useState("");
  const [announcerLookupDebounced, setAnnouncerLookupDebounced] = useState("");
  const [showAnnouncerLookup, setShowAnnouncerLookup] = useState(false);
  const [runForm, setRunForm] = useState({
    announcerUid: "",
    sourceId: "",
    resolveOriginalMedia: true,
  });
  const [jsonImportText, setJsonImportText] = useState("");
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [jobModalMode, setJobModalMode] = useState<JobActionModalMode | null>(null);
  const [jobModalJob, setJobModalJob] = useState<JobItem | null>(null);
  const [jobModalReason, setJobModalReason] = useState("");
  const [jobModalDetails, setJobModalDetails] = useState<JobDetailsPayload | null>(null);
  const [jobModalLogs, setJobModalLogs] = useState<JobLogsPayload | null>(null);
  const [actionModalMode, setActionModalMode] = useState<SocialImportActionModalMode | null>(null);
  const [actionModalSource, setActionModalSource] = useState<SourceItem | null>(null);
  const [actionModalCandidate, setActionModalCandidate] = useState<ReviewItem | null>(null);
  const [candidateTypeDraft, setCandidateTypeDraft] = useState<string>("Property");
  const [actionSourceForm, setActionSourceForm] = useState({
    announcerUid: "",
    platform: "facebook" as SourceItem["platform"],
    sourceType: "profile" as SourceItem["sourceType"],
    sourceUrl: "",
  });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me", "social-import"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canReadModule = hasPermission(permissions, "social_import.read");
  const canReadAnnouncers = hasPermission(permissions, "announcers.read");
  const canReadSources = hasPermission(permissions, "social_import.source.read");
  const canReadJobs = hasPermission(permissions, "social_import.job.read");
  const canReadReview = hasPermission(permissions, "social_import.review");
  const canReadDecisions = hasPermission(permissions, "social_import.decision.read");
  const canCreateSource = hasPermission(permissions, "social_import.source.create");
  const canPauseSource = hasPermission(permissions, "social_import.source.pause");
  const canRevokeSource = hasPermission(permissions, "social_import.source.revoke");
  const canRunProd = hasPermission(permissions, "social_import.run.prod");
  const canRetryJob = hasPermission(permissions, "social_import.job.retry");
  const canRejectCandidate = hasPermission(permissions, "social_import.reject");
  const canDeleteCandidate = hasPermission(permissions, "social_import.reject");
  const canPublishCandidate = hasPermission(permissions, "social_import.publish");
  const canExport = hasPermission(permissions, "social_import.export");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (queryApplied) {
      params.set("query", queryApplied);
    }
    return params.toString();
  }, [limit, queryApplied]);

  const reviewQueryParams = useMemo(() => {
    const params = new URLSearchParams(queryParams);
    params.set("status", reviewStatusFilter);
    return params.toString();
  }, [queryParams, reviewStatusFilter]);

  const sourcesQuery = useQuery({
    queryKey: ["dashboard", "social-import", "sources", queryParams, canReadSources],
    enabled: canReadModule && canReadSources,
    queryFn: () =>
      fetchJson<SourcesPayload>(
        `/api/admin/v1/social-import/sources?${queryParams}`,
        "Impossible de charger les sources social import.",
      ),
  });

  const jobsQuery = useQuery({
    queryKey: ["dashboard", "social-import", "jobs", queryParams, canReadJobs],
    enabled: canReadModule && canReadJobs,
    refetchInterval: canReadModule && canReadJobs ? 7000 : false,
    refetchIntervalInBackground: true,
    queryFn: () =>
      fetchJson<JobsPayload>(
        `/api/admin/v1/social-import/jobs?${queryParams}`,
        "Impossible de charger les jobs social import.",
      ),
  });

  const reviewQuery = useQuery({
    queryKey: ["dashboard", "social-import", "review", reviewQueryParams, canReadReview],
    enabled: canReadModule && canReadReview,
    refetchInterval: canReadModule && canReadReview ? 10000 : false,
    refetchIntervalInBackground: true,
    queryFn: () =>
      fetchJson<ReviewPayload>(
        `/api/admin/v1/social-import/review?${reviewQueryParams}`,
        "Impossible de charger la file review social import.",
      ),
  });

  const decisionsQuery = useQuery({
    queryKey: ["dashboard", "social-import", "decisions", queryParams, canReadDecisions],
    enabled: canReadModule && canReadDecisions,
    queryFn: () =>
      fetchJson<DecisionsPayload>(
        `/api/admin/v1/social-import/decisions?${queryParams}`,
        "Impossible de charger les décisions social import.",
      ),
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAnnouncerLookupDebounced(announcerLookupInput.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [announcerLookupInput]);

  const announcerLookupQuery = useQuery({
    queryKey: ["dashboard", "social-import", "announcer-lookup", announcerLookupDebounced],
    enabled:
      canReadModule &&
      canReadAnnouncers &&
      announcerLookupDebounced.length >= 2,
    queryFn: () =>
      fetchJson<AnnouncerLookupPayload>(
        `/api/admin/v1/announcers?limit=20&query=${encodeURIComponent(
          announcerLookupDebounced,
        )}`,
        "Impossible de rechercher les annonceurs.",
      ),
  });

  const isLoadingAny =
    permissionsQuery.isLoading ||
    sourcesQuery.isFetching ||
    jobsQuery.isFetching ||
    reviewQuery.isFetching ||
    decisionsQuery.isFetching;

  const globalError =
    permissionsQuery.error?.message ||
    sourcesQuery.error?.message ||
    jobsQuery.error?.message ||
    reviewQuery.error?.message ||
    decisionsQuery.error?.message ||
    null;

  const sources = sourcesQuery.data?.sources ?? [];
  const jobs = jobsQuery.data?.jobs ?? [];
  const candidates = useMemo(
    () => reviewQuery.data?.candidates ?? [],
    [reviewQuery.data?.candidates],
  );
  const decisions = decisionsQuery.data?.decisions ?? [];
  const announcerLookupResults = announcerLookupQuery.data?.announcers ?? [];
  const selectedCandidateIdsResolved = useMemo(() => {
    const availableIds = new Set(candidates.map((candidate) => candidate.id));
    return selectedCandidateIds.filter((candidateId) => availableIds.has(candidateId));
  }, [candidates, selectedCandidateIds]);
  const actionModalCandidateAttributes = useMemo(
    () => buildCandidateFullAttributes(actionModalCandidate),
    [actionModalCandidate],
  );
  const actionModalCandidateAttributeEntries = useMemo(
    () =>
      Object.entries(actionModalCandidateAttributes).sort(([keyA], [keyB]) =>
        keyA.localeCompare(keyB, "fr"),
      ),
    [actionModalCandidateAttributes],
  );

  function closeJobActionModal() {
    setJobModalMode(null);
    setJobModalJob(null);
    setJobModalReason("");
    setJobModalDetails(null);
    setJobModalLogs(null);
  }

  function closeActionModal() {
    setActionModalMode(null);
    setActionModalSource(null);
    setActionModalCandidate(null);
    setActionSourceForm({
      announcerUid: runForm.announcerUid.trim(),
      platform: "facebook",
      sourceType: "profile",
      sourceUrl: "",
    });
    setCandidateTypeDraft("Property");
  }

  function onApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQueryApplied(queryDraft.trim());
  }

  function onRefreshAll() {
    void permissionsQuery.refetch();
    void sourcesQuery.refetch();
    void jobsQuery.refetch();
    void reviewQuery.refetch();
    void decisionsQuery.refetch();
    void announcerLookupQuery.refetch();
  }

  function selectAnnouncer(announcer: AnnouncerLookupItem) {
    setRunForm((previous) => ({
      ...previous,
      announcerUid: announcer.uid,
    }));
    setAnnouncerLookupInput(
      `${announcer.fullName}${announcer.email ? ` — ${announcer.email}` : ""} (${announcer.uid})`,
    );
    setShowAnnouncerLookup(false);
  }

  async function mutateJson<T>({
    url,
    method,
    body,
    headers,
  }: {
    url: string;
    method: "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }) {
    const response = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as
      | { success: true; data: T }
      | { success: false; error?: { message?: string; details?: Record<string, unknown> } }
      | null;

    if (!response.ok || !payload?.success) {
      const message =
        payload && "success" in payload && !payload.success
          ? payload.error?.message || "Opération impossible."
          : "Opération impossible.";
      throw new Error(message);
    }

    return payload.data;
  }

  async function withAction<T>(key: string, action: () => Promise<T>, successMessage: string) {
    setPendingActionKey(key);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await action();
      setActionMessage(successMessage);
      onRefreshAll();
      return result;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action impossible.");
      return null;
    } finally {
      setPendingActionKey(null);
    }
  }

  function buildIdempotencyKey(prefix: string) {
    const random =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `fallback_${prefix}`;
    return `${prefix}_${random}`;
  }

  async function handleCreateSource() {
    setActionSourceForm({
      announcerUid: runForm.announcerUid.trim(),
      platform: "facebook",
      sourceType: "profile",
      sourceUrl: "",
    });
    setActionModalMode("create_source");
  }

  async function handleConfirmCreateSource() {
    const announcerUid = actionSourceForm.announcerUid.trim();
    const sourceUrl = actionSourceForm.sourceUrl.trim();
    if (!announcerUid) {
      setActionError("UID annonceur obligatoire.");
      return;
    }
    if (!sourceUrl) {
      setActionError("URL source obligatoire.");
      return;
    }

    const result = await withAction(
      "source_create",
      () =>
        mutateJson({
          url: "/api/admin/v1/social-import/sources",
          method: "POST",
          body: {
            announcerUid,
            platform: actionSourceForm.platform,
            sourceType: actionSourceForm.sourceType,
            sourceUrl,
            status: "active",
          },
        }),
      "Source créée avec succès.",
    );

    if (result) {
      closeActionModal();
    }
  }

  async function handlePauseSource(source: SourceItem) {
    setActionModalSource(source);
    setActionModalMode("pause_source");
  }

  async function handleConfirmPauseSource() {
    if (!actionModalSource) {
      return;
    }

    const result = await withAction(
      `source_pause_${actionModalSource.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/sources/${actionModalSource.id}/pause`,
          method: "POST",
        }),
      "Source mise en pause.",
    );

    if (result) {
      closeActionModal();
    }
  }

  async function handleRevokeSource(source: SourceItem) {
    setActionModalSource(source);
    setActionModalMode("revoke_source");
  }

  async function handleConfirmRevokeSource() {
    if (!actionModalSource) {
      return;
    }

    const result = await withAction(
      `source_revoke_${actionModalSource.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/sources/${actionModalSource.id}/revoke`,
          method: "POST",
        }),
      "Source révoquée.",
    );

    if (result) {
      closeActionModal();
    }
  }

  async function handleImportJsonPosts() {
    const announcerUid = runForm.announcerUid.trim();
    if (!announcerUid) {
      setActionError("Sélectionne d'abord un annonceur avant d'importer le JSON.");
      return;
    }

    const rawText = jsonImportText.trim();
    if (!rawText) {
      setActionError("Colle le JSON des posts avant de lancer l'import.");
      return;
    }

    let parsedPosts: unknown;
    try {
      parsedPosts = JSON.parse(rawText);
    } catch {
      setActionError("JSON invalide: impossible de parser le contenu collé.");
      return;
    }

    if (!Array.isArray(parsedPosts) || parsedPosts.length === 0) {
      setActionError("Le JSON doit être un tableau non vide d'objets posts.");
      return;
    }

    const result = await withAction<JsonImportPayload>(
      "job_json_import",
      () =>
        mutateJson<JsonImportPayload>({
          url: "/api/admin/v1/social-import/import/json",
          method: "POST",
          body: {
            announcerUid,
            sourceId: runForm.sourceId.trim() || undefined,
            resolveOriginalMedia: runForm.resolveOriginalMedia,
            posts: parsedPosts,
          },
          headers: {
            "idempotency-key": buildIdempotencyKey("si_json_import"),
          },
        }),
      "Import JSON déclenché.",
    );

    if (result?.job?.id) {
      setActionMessage(
        `Import JSON terminé: ${formatNumber(result.importedCount)} post(s) → job ${result.job.id} (${result.job.status}).`,
      );
    }
  }

  async function handleViewJobDetails(job: JobItem) {
    const result = await withAction(
      `job_details_${job.id}`,
      () =>
        fetchJson<JobDetailsPayload>(
          `/api/admin/v1/social-import/jobs/${job.id}`,
          "Impossible de charger les détails du job.",
        ),
      "Détails job chargés.",
    );

    if (!result?.job) {
      return;
    }
    setJobModalJob(result.job);
    setJobModalDetails(result);
    setJobModalMode("details");
  }

  async function handleViewJobLogs(job: JobItem) {
    const result = await withAction(
      `job_logs_${job.id}`,
      () =>
        fetchJson<JobLogsPayload>(
          `/api/admin/v1/social-import/jobs/${job.id}/logs`,
          "Impossible de charger les logs du job.",
        ),
      "Logs job chargés.",
    );
    if (!result) {
      return;
    }
    setJobModalJob(result.job);
    setJobModalLogs(result);
    setJobModalMode("logs");
  }

  async function handleCancelJob(job: JobItem) {
    setJobModalJob(job);
    setJobModalReason("");
    setJobModalMode("cancel");
  }

  async function handleConfirmJobCancel() {
    if (!jobModalJob) {
      return;
    }
    const result = await withAction(
      `job_cancel_${jobModalJob.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/jobs/${jobModalJob.id}/cancel`,
          method: "POST",
          body: { reason: jobModalReason.trim() || undefined },
        }),
      "Job annulé.",
    );
    if (result) {
      closeJobActionModal();
    }
  }

  async function handleRejectCandidate(candidate: ReviewItem) {
    setActionModalCandidate(candidate);
    setActionModalMode("reject_candidate");
  }

  async function handleEditCandidateType(candidate: ReviewItem) {
    setActionModalCandidate(candidate);
    setCandidateTypeDraft(candidate.typeProperty || "Property");
    setActionModalMode("edit_candidate_type");
  }

  async function handleConfirmEditCandidateType() {
    if (!actionModalCandidate) {
      return;
    }
    const nextType = candidateTypeDraft.trim();
    if (!nextType) {
      setActionError("Sélectionne un type d'annonce.");
      return;
    }

    const result = await withAction(
      `candidate_type_${actionModalCandidate.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/review/${actionModalCandidate.id}`,
          method: "PATCH",
          body: {
            typeProperty: nextType,
          },
        }),
      "Type candidate mis à jour.",
    );

    if (result) {
      closeActionModal();
    }
  }

  async function handleConfirmRejectCandidate() {
    if (!actionModalCandidate) {
      return;
    }

    const result = await withAction(
      `candidate_reject_${actionModalCandidate.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/review/${actionModalCandidate.id}/reject`,
          method: "POST",
        }),
      "Candidate rejetée.",
    );

    if (result) {
      closeActionModal();
    }
  }

  async function handlePublishCandidate(candidate: ReviewItem) {
    setActionModalCandidate(candidate);
    setActionModalMode("publish_candidate");
  }

  async function handleConfirmPublishCandidate() {
    if (!actionModalCandidate) {
      return;
    }

    const result = await withAction(
      `candidate_publish_${actionModalCandidate.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/review/${actionModalCandidate.id}/publish`,
          method: "POST",
          headers: {
            "idempotency-key": buildIdempotencyKey(`si_publish_${actionModalCandidate.id}`),
          },
        }),
      "Candidate publiée.",
    );

    if (result) {
      closeActionModal();
    }
  }

  async function handleDeleteCandidate(candidate: ReviewItem) {
    setActionModalCandidate(candidate);
    setActionModalMode("delete_candidate");
  }

  async function handleConfirmDeleteCandidate() {
    if (!actionModalCandidate) {
      return;
    }

    const result = await withAction(
      `candidate_delete_${actionModalCandidate.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/review/${actionModalCandidate.id}`,
          method: "DELETE",
        }),
      "Candidate supprimée.",
    );

    if (result) {
      setSelectedCandidateIds((previous) =>
        previous.filter((candidateId) => candidateId !== actionModalCandidate.id),
      );
      closeActionModal();
    }
  }

  function toggleCandidateSelection(candidateId: string, checked: boolean) {
    setSelectedCandidateIds((previous) => {
      if (checked) {
        if (previous.includes(candidateId)) {
          return previous;
        }
        return [...previous, candidateId];
      }
      return previous.filter((value) => value !== candidateId);
    });
  }

  function selectAllVisibleCandidates() {
    setSelectedCandidateIds(candidates.map((candidate) => candidate.id));
  }

  function clearCandidateSelection() {
    setSelectedCandidateIds([]);
  }

  async function handleDeleteSelectedCandidates() {
    if (selectedCandidateIdsResolved.length === 0) {
      setActionError("Sélectionne au moins une candidate à supprimer.");
      return;
    }
    setActionModalMode("delete_candidates_bulk");
  }

  async function handleConfirmDeleteCandidatesBulk() {
    const selectedIds = selectedCandidateIdsResolved;
    if (selectedIds.length === 0) {
      setActionError("Aucune candidate sélectionnée.");
      return;
    }

    const result = await withAction(
      `candidate_delete_bulk_${selectedIds.length}`,
      () =>
        mutateJson<{
          requestedCount: number;
          deletedCount: number;
          skippedPublishedCount: number;
          notFoundCount: number;
        }>({
          url: "/api/admin/v1/social-import/review/bulk-delete",
          method: "POST",
          body: {
            candidateIds: selectedIds,
          },
        }),
      "Suppression multiple terminée.",
    );

    if (result) {
      setActionMessage(
        `Suppression: ${result.deletedCount}/${result.requestedCount} supprimée(s), ${result.skippedPublishedCount} publiée(s) ignorée(s), ${result.notFoundCount} introuvable(s).`,
      );
      clearCandidateSelection();
      closeActionModal();
    }
  }

  async function handleAutoFixCandidates() {
    const selectedIds = selectedCandidateIdsResolved;
    const fallbackVisibleIds = candidates
      .filter((candidate) => candidate.status !== "published" && candidate.status !== "rejected")
      .map((candidate) => candidate.id);
    const targetIds = selectedIds.length > 0 ? selectedIds : fallbackVisibleIds;

    if (targetIds.length === 0) {
      setActionError("Aucune candidate auto-corrigeable dans la vue courante.");
      return;
    }

    const result = await withAction(
      `candidate_autofix_${targetIds.length}`,
      () =>
        mutateJson<AutoFixCandidatesPayload>({
          url: "/api/admin/v1/social-import/review/auto-fix",
          method: "POST",
          body: {
            candidateIds: targetIds,
          },
        }),
      "Auto-correction terminée.",
    );

    if (result) {
      setActionMessage(
        `Auto-correction: ${result.correctedCount}/${result.requestedCount} corrigée(s), ${result.stillNeedsReviewCount} encore en review, ${result.skippedPublishedCount} publiée(s) ignorée(s), ${result.skippedRejectedCount} rejetée(s) ignorée(s), ${result.notFoundCount} introuvable(s).`,
      );
      clearCandidateSelection();
    }
  }

  function buildExportQueryParams() {
    const params = new URLSearchParams();
    if (queryApplied) {
      params.set("query", queryApplied);
    }
    if (runForm.announcerUid.trim()) {
      params.set("announcerUid", runForm.announcerUid.trim());
    }
    return params.toString();
  }

  function handleExport(kind: "jobs" | "kpi" | "rejections") {
    const params = buildExportQueryParams();
    const url = `/api/admin/v1/social-import/export/${kind}${params ? `?${params}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSubmitActionModal() {
    if (actionModalMode === "create_source") {
      await handleConfirmCreateSource();
      return;
    }
    if (actionModalMode === "pause_source") {
      await handleConfirmPauseSource();
      return;
    }
    if (actionModalMode === "revoke_source") {
      await handleConfirmRevokeSource();
      return;
    }
    if (actionModalMode === "edit_candidate_type") {
      await handleConfirmEditCandidateType();
      return;
    }
    if (actionModalMode === "reject_candidate") {
      await handleConfirmRejectCandidate();
      return;
    }
    if (actionModalMode === "publish_candidate") {
      await handleConfirmPublishCandidate();
      return;
    }
    if (actionModalMode === "delete_candidate") {
      await handleConfirmDeleteCandidate();
      return;
    }
    if (actionModalMode === "delete_candidates_bulk") {
      await handleConfirmDeleteCandidatesBulk();
    }
  }

  const actionModalTitle =
    actionModalMode === "create_source"
      ? "Ajouter une source"
      : actionModalMode === "pause_source"
        ? "Mettre en pause la source"
        : actionModalMode === "revoke_source"
          ? "Révoquer la source"
          : actionModalMode === "edit_candidate_type"
            ? "Corriger l'annonce"
          : actionModalMode === "reject_candidate"
            ? "Rejeter la candidate"
            : actionModalMode === "publish_candidate"
              ? "Valider et publier"
              : actionModalMode === "delete_candidate"
                ? "Supprimer la candidate"
                : actionModalMode === "delete_candidates_bulk"
                  ? "Supprimer la sélection"
                : "Action";

  const actionModalDescription =
    actionModalMode === "create_source"
      ? "Renseigne les informations de la source à créer."
      : actionModalMode === "pause_source"
        ? `Source: ${actionModalSource?.id ?? "N/A"}`
        : actionModalMode === "revoke_source"
          ? `Source: ${actionModalSource?.id ?? "N/A"}`
          : actionModalMode === "edit_candidate_type"
            ? `Candidate: ${actionModalCandidate?.rawPostId ?? "N/A"} · édite les attributs puis applique la correction`
          : actionModalMode === "reject_candidate"
            ? `Candidate: ${actionModalCandidate?.rawPostId ?? "N/A"}`
            : actionModalMode === "publish_candidate"
              ? `Candidate: ${actionModalCandidate?.rawPostId ?? "N/A"}`
              : actionModalMode === "delete_candidate"
                ? `Candidate: ${actionModalCandidate?.rawPostId ?? "N/A"}`
                : actionModalMode === "delete_candidates_bulk"
                  ? `${selectedCandidateIdsResolved.length} candidate(s) sélectionnée(s)`
                : "";

  const actionModalConfirmLabel =
    actionModalMode === "create_source"
      ? "Créer la source"
      : actionModalMode === "pause_source"
        ? "Confirmer la pause"
        : actionModalMode === "revoke_source"
          ? "Confirmer la révocation"
          : actionModalMode === "edit_candidate_type"
            ? "Appliquer la correction"
          : actionModalMode === "reject_candidate"
            ? "Confirmer le rejet"
            : actionModalMode === "publish_candidate"
              ? "Valider et pousser dans properties"
              : actionModalMode === "delete_candidate"
                ? "Confirmer la suppression"
                : actionModalMode === "delete_candidates_bulk"
                  ? "Confirmer la suppression multiple"
                : "Confirmer";

  const actionModalConfirmVariant =
    actionModalMode === "revoke_source" ||
    actionModalMode === "reject_candidate" ||
    actionModalMode === "delete_candidate" ||
    actionModalMode === "delete_candidates_bulk"
      ? "destructive"
      : actionModalMode === "create_source" ||
          actionModalMode === "publish_candidate" ||
          actionModalMode === "edit_candidate_type"
        ? "secondary"
        : "outline";

  if (permissionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Import social"
          description="Chargement des permissions et des données du module."
        />
        <Card>
          <CardContent className="pt-5 text-sm text-slate-600">Chargement en cours…</CardContent>
        </Card>
      </div>
    );
  }

  if (!canReadModule) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Import social"
          description="Pilotage de l'import d'annonces depuis les réseaux sociaux."
        />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5 text-sm text-amber-800">
            Permission manquante: <code>social_import.read</code>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import social"
        description="Sources annonceurs, exécutions jobs, file review et historique des décisions."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canCreateSource ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateSource}
                disabled={pendingActionKey !== null}
              >
                Ajouter source
              </Button>
            ) : null}
            {canExport ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExport("jobs")}
                  disabled={pendingActionKey !== null}
                >
                  Export jobs
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExport("kpi")}
                  disabled={pendingActionKey !== null}
                >
                  Export KPI
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExport("rejections")}
                  disabled={pendingActionKey !== null}
                >
                  Export rejets
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={onRefreshAll}
              disabled={isLoadingAny || pendingActionKey !== null}
            >
              <RefreshCcw className="mr-2 size-4" />
              Actualiser
            </Button>
          </div>
        }
      />

      {globalError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-5 text-sm text-red-700">{globalError}</CardContent>
        </Card>
      ) : null}
      {actionError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-5 text-sm text-red-700">{actionError}</CardContent>
        </Card>
      ) : null}
      {actionMessage ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-5 text-sm text-emerald-700">{actionMessage}</CardContent>
        </Card>
      ) : null}

      <Sheet
        open={jobModalMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeJobActionModal();
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {jobModalMode === "details"
                ? "Détails du job"
                : jobModalMode === "logs"
                  ? "Logs du job"
                  : jobModalMode === "cancel"
                    ? "Annuler le job"
                    : "Action job"}
            </SheetTitle>
            <SheetDescription>
              {jobModalJob
                ? `Job ${jobModalJob.id} · ${jobModalJob.environment} · ${jobModalJob.status}`
                : "Aucun job sélectionné."}
            </SheetDescription>
          </SheetHeader>

          {jobModalMode === "details" && jobModalDetails ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Début:</span>{" "}
                  {toDateLabel(jobModalDetails.job.startedAt ?? jobModalDetails.job.createdAt)}
                </p>
                <p>
                  <span className="font-medium">Fin:</span> {toDateLabel(jobModalDetails.job.endedAt)}
                </p>
                <p>
                  <span className="font-medium">Annonceurs:</span>{" "}
                  {jobModalDetails.job.announcerScope.length
                    ? jobModalDetails.job.announcerScope.join(", ")
                    : "all"}
                </p>
                <p>
                  <span className="font-medium">Erreur:</span>{" "}
                  {jobModalDetails.job.errorSummary || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Compteurs:</span> fetch{" "}
                  {formatNumber(jobModalDetails.job.counters.rawFetched)} | ok{" "}
                  {formatNumber(jobModalDetails.job.counters.normalizedOk)} | review{" "}
                  {formatNumber(jobModalDetails.job.counters.needsReview)} | pub{" "}
                  {formatNumber(jobModalDetails.job.counters.published)}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Metadata brute</p>
                <pre className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                  {JSON.stringify(jobModalDetails.job.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}

          {jobModalMode === "logs" && jobModalLogs ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Run externe:</span>{" "}
                  {jobModalLogs.logs.externalRunId || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Mode exécution:</span> local
                </p>
                <p>
                  <span className="font-medium">Résumé erreur:</span>{" "}
                  {jobModalLogs.job.errorSummary || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Callback ingéré:</span>{" "}
                  {toDateLabel(jobModalLogs.logs.callbackIngestedAt || null)}
                </p>
              </div>

              {jobModalLogs.logs.hints.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-800">Indices de diagnostic</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-900">
                    {jobModalLogs.logs.hints.map((hint, index) => (
                      <li key={`${jobModalLogs.job.id}_hint_${index + 1}`}>{hint}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {jobModalMode === "cancel" ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Annonceurs:</span>{" "}
                  {jobModalJob?.announcerScope.length ? jobModalJob.announcerScope.join(", ") : "all"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">
                  Motif (optionnel)
                </p>
                <Input
                  value={jobModalReason}
                  onChange={(event) => setJobModalReason(event.target.value)}
                  placeholder="Décris brièvement l'action à exécuter"
                />
              </div>
            </div>
          ) : null}

          <SheetFooter>
            <Button type="button" variant="outline" onClick={closeJobActionModal}>
              Fermer
            </Button>
            {jobModalMode === "cancel" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pendingActionKey !== null}
                onClick={() => void handleConfirmJobCancel()}
              >
                Confirmer annulation
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={actionModalMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeActionModal();
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{actionModalTitle}</SheetTitle>
            <SheetDescription>{actionModalDescription}</SheetDescription>
          </SheetHeader>

          {actionModalMode === "create_source" ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">UID annonceur</p>
                <Input
                  value={actionSourceForm.announcerUid}
                  onChange={(event) =>
                    setActionSourceForm((previous) => ({
                      ...previous,
                      announcerUid: event.target.value,
                    }))
                  }
                  placeholder="UID annonceur"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Plateforme</p>
                <select
                  value={actionSourceForm.platform}
                  onChange={(event) =>
                    setActionSourceForm((previous) => ({
                      ...previous,
                      platform: event.target.value as SourceItem["platform"],
                    }))
                  }
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="facebook">facebook</option>
                  <option value="instagram">instagram</option>
                  <option value="tiktok">tiktok</option>
                  <option value="linkedin">linkedin</option>
                  <option value="x">x</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Type</p>
                <select
                  value={actionSourceForm.sourceType}
                  onChange={(event) =>
                    setActionSourceForm((previous) => ({
                      ...previous,
                      sourceType: event.target.value as SourceItem["sourceType"],
                    }))
                  }
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="profile">profile</option>
                  <option value="page">page</option>
                  <option value="group_user">group_user</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">URL source</p>
                <Input
                  value={actionSourceForm.sourceUrl}
                  onChange={(event) =>
                    setActionSourceForm((previous) => ({
                      ...previous,
                      sourceUrl: event.target.value,
                    }))
                  }
                  placeholder="https://www.facebook.com/..."
                />
              </div>
            </div>
          ) : null}

          {actionModalMode === "pause_source" || actionModalMode === "revoke_source" ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Source:</span> {actionModalSource?.id ?? "N/A"}
                </p>
                <p>
                  <span className="font-medium">Annonceur:</span>{" "}
                  {actionModalSource?.announcerUid ?? "N/A"}
                </p>
              </div>
            </div>
          ) : null}

          {actionModalMode === "reject_candidate" ||
          actionModalMode === "edit_candidate_type" ||
          actionModalMode === "publish_candidate" ||
          actionModalMode === "delete_candidate" ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Post:</span> {actionModalCandidate?.rawPostId ?? "N/A"}
                </p>
                <p>
                  <span className="font-medium">Annonceur:</span>{" "}
                  {actionModalCandidate?.announcerUid ?? "N/A"}
                </p>
                <p>
                  <span className="font-medium">Statut:</span>{" "}
                  {actionModalCandidate?.status ?? "N/A"}
                </p>
              </div>
              {actionModalMode === "edit_candidate_type" ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-600">
                      Type d'annonce cible
                    </p>
                    <select
                      value={candidateTypeDraft}
                      onChange={(event) => setCandidateTypeDraft(event.target.value)}
                      className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                    >
                      {LISTING_TYPE_OPTIONS.map((typeOption) => (
                        <option key={typeOption} value={typeOption}>
                          {typeOption}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      Cette action reconstruit automatiquement les attributs requis du modèle avant publication.
                    </p>
                  </div>
                  <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Attributs actuels de l'annonce (intégral)
                    </p>
                    <div className="max-h-60 overflow-auto rounded border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Attribut</th>
                            <th className="px-2 py-1.5 font-medium">Valeur</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actionModalCandidateAttributeEntries.length > 0 ? (
                            actionModalCandidateAttributeEntries.map(([attributeKey, attributeValue]) => (
                              <tr key={`attribute_${attributeKey}`} className="border-t border-slate-100">
                                <td className="px-2 py-1.5 font-mono text-[11px] text-slate-700">
                                  {attributeKey}
                                </td>
                                <td className="px-2 py-1.5 text-slate-600">
                                  {formatUnknownForDisplay(attributeValue)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="px-2 py-2 text-slate-500">
                                Aucun attribut disponible.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-medium text-slate-600">JSON brut</p>
                      <pre className="max-h-48 overflow-auto rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-700">
                        {JSON.stringify(actionModalCandidateAttributes, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {actionModalMode === "delete_candidates_bulk" ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Sélection:</span>{" "}
                  {selectedCandidateIdsResolved.length} candidate(s)
                </p>
                <p className="text-xs text-slate-500">
                  Les candidates déjà publiées seront ignorées automatiquement.
                </p>
              </div>
            </div>
          ) : null}

          <SheetFooter>
            <Button type="button" variant="outline" onClick={closeActionModal}>
              Fermer
            </Button>
            {actionModalMode ? (
              <Button
                type="button"
                variant={actionModalConfirmVariant}
                disabled={pendingActionKey !== null}
                onClick={() => void handleSubmitActionModal()}
              >
                {actionModalConfirmLabel}
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filtres lecture</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onApplyFilters}>
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Recherche (uid, job, post, url...)"
            />
            <select
              value={String(limit)}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="20">20 lignes</option>
              <option value="50">50 lignes</option>
              <option value="100">100 lignes</option>
            </select>
            <select
              value={reviewStatusFilter}
              onChange={(event) => setReviewStatusFilter(event.target.value as ReviewStatusFilter)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="open">File review: à traiter</option>
              <option value="processed">File review: traitées</option>
              <option value="all">File review: toutes</option>
              <option value="ready_to_publish">Prêtes à publier</option>
              <option value="needs_review">En révision</option>
              <option value="published">Publiées (production)</option>
              <option value="rejected">Rejetées</option>
            </select>
            <Button type="submit">Appliquer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Import JSON annonceur</h2>
          <Badge variant={canRunProd ? "success" : "warning"}>
            {canRunProd ? "Import autorisé" : "Permission manquante"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {canReadAnnouncers ? (
              <>
                <div className="relative space-y-1 xl:col-span-2">
                  <p className="text-xs font-medium text-slate-600">Annonceur (recherche)</p>
                  <Input
                    value={announcerLookupInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAnnouncerLookupInput(value);
                      setShowAnnouncerLookup(true);
                      if (!value.trim()) {
                        setRunForm((previous) => ({ ...previous, announcerUid: "" }));
                      }
                    }}
                    onFocus={() => setShowAnnouncerLookup(true)}
                    onBlur={() => {
                      setTimeout(() => setShowAnnouncerLookup(false), 120);
                    }}
                    placeholder="Recherche par nom, email, téléphone ou UID"
                  />
                  {showAnnouncerLookup && announcerLookupInput.trim().length >= 2 ? (
                    <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {announcerLookupQuery.isFetching ? (
                        <p className="px-3 py-2 text-xs text-slate-500">Recherche en cours…</p>
                      ) : announcerLookupQuery.error ? (
                        <p className="px-3 py-2 text-xs text-red-600">
                          {announcerLookupQuery.error.message}
                        </p>
                      ) : announcerLookupResults.length ? (
                        announcerLookupResults.map((announcer) => (
                          <button
                            key={announcer.uid}
                            type="button"
                            className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onMouseDown={() => selectAnnouncer(announcer)}
                          >
                            <p className="font-medium text-slate-900">{announcer.fullName}</p>
                            <p className="text-xs text-slate-500">
                              {announcer.email || "email non renseigné"} · {announcer.uid}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-slate-500">Aucun annonceur trouvé.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">UID annonceur sélectionné</p>
                  <Input value={runForm.announcerUid} readOnly placeholder="Sélectionne un annonceur" />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">UID annonceur</p>
                <Input
                  value={runForm.announcerUid}
                  onChange={(event) =>
                    setRunForm((previous) => ({
                      ...previous,
                      announcerUid: event.target.value,
                    }))
                  }
                  placeholder="Ex: cd2POQU74IV7F6Rlhm6Nlmz0qUs1"
                />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Source ID (optionnel)</p>
              <Input
                value={runForm.sourceId}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    sourceId: event.target.value,
                  }))
                }
                placeholder="ID de la source import"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Images</p>
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={runForm.resolveOriginalMedia}
                  onChange={(event) =>
                    setRunForm((previous) => ({
                      ...previous,
                      resolveOriginalMedia: event.target.checked,
                    }))
                  }
                />
                Récupérer les photos originales via post_url
              </label>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-900">Importer des posts JSON</p>
            <p className="text-xs text-slate-500">
              Colle ici un tableau JSON de posts Facebook (comme ton format `facebook_id/post_id/caption/media_urls`).
            </p>
            <textarea
              value={jsonImportText}
              onChange={(event) => setJsonImportText(event.target.value)}
              placeholder='[{"facebook_id":"...","post_id":"...","caption":"...","media_urls":[{"url":"..."}]}]'
              className="min-h-40 w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-900"
            />
            <div className="flex flex-wrap gap-2">
              {canRunProd ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleImportJsonPosts()}
                  disabled={pendingActionKey !== null}
                >
                  Importer JSON vers file review
                </Button>
              ) : (
                <p className="text-sm text-amber-700">
                  Permission manquante: <code>social_import.run.prod</code>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Sources</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(sourcesQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Jobs</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(jobsQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Review</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(reviewQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Décisions</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(decisionsQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Sources</h2>
          <Badge variant={canReadSources ? "success" : "warning"}>
            {canReadSources ? "Lecture autorisée" : "Permission manquante"}
          </Badge>
        </CardHeader>
        <CardContent>
          {canReadSources ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">Annonceur</th>
                    <th className="py-2 pr-4 font-medium">Plateforme</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 pr-4 font-medium">Dernier import</th>
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {sources.length ? (
                    sources.map((source) => (
                      <tr key={source.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">{source.announcerUid || "N/A"}</td>
                        <td className="py-3 pr-4">{source.platform}</td>
                        <td className="py-3 pr-4">{source.sourceType}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={toStatusBadgeVariant(source.status)}>{source.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">{toDateLabel(source.lastImportAt)}</td>
                        <td className="py-3 pr-4">
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-700 hover:underline"
                          >
                            Ouvrir
                          </a>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {canPauseSource && source.status !== "paused" && source.status !== "revoked" ? (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handlePauseSource(source)}
                              >
                                Pause
                              </Button>
                            ) : null}
                            {canRevokeSource && source.status !== "revoked" ? (
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handleRevokeSource(source)}
                              >
                                Révoquer
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-slate-500" colSpan={7}>
                        Aucune source trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-amber-700">Permission manquante: social_import.source.read</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Jobs</h2>
          <Badge variant={canReadJobs ? "success" : "warning"}>
            {canReadJobs ? "Lecture autorisée" : "Permission manquante"}
          </Badge>
        </CardHeader>
        <CardContent>
          {canReadJobs ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">Job</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 pr-4 font-medium">Mode</th>
                    <th className="py-2 pr-4 font-medium">Environnement</th>
                    <th className="py-2 pr-4 font-medium">Annonceurs</th>
                    <th className="py-2 pr-4 font-medium">Compteurs</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {jobs.length ? (
                    jobs.map((job) => (
                      <tr key={job.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-900">{job.id}</p>
                          <p className="text-xs text-slate-500">{toDateLabel(job.startedAt ?? job.createdAt)}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={toStatusBadgeVariant(job.status)}>{job.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">{job.mode}</td>
                        <td className="py-3 pr-4">{job.environment}</td>
                        <td className="py-3 pr-4">{job.announcerScope.length ? job.announcerScope.join(", ") : "all"}</td>
                        <td className="py-3 pr-4 text-xs">
                          fetch {formatNumber(job.counters.rawFetched)} | ok {formatNumber(job.counters.normalizedOk)} |
                          review {formatNumber(job.counters.needsReview)} | pub {formatNumber(job.counters.published)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={pendingActionKey !== null}
                              onClick={() => void handleViewJobDetails(job)}
                            >
                              Détails
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={pendingActionKey !== null}
                              onClick={() => void handleViewJobLogs(job)}
                            >
                              Logs
                            </Button>
                            {canRetryJob && job.status === "running" ? (
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handleCancelJob(job)}
                              >
                                Annuler
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-slate-500" colSpan={7}>
                        Aucun job trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-amber-700">Permission manquante: social_import.job.read</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">File review</h2>
              <Badge variant={canReadReview ? "success" : "warning"}>
                {canReadReview ? "Lecture autorisée" : "Permission manquante"}
              </Badge>
            </div>
            {canReadReview && (canDeleteCandidate || canPublishCandidate) ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pendingActionKey !== null || candidates.length === 0}
                  onClick={selectAllVisibleCandidates}
                >
                  Tout sélectionner
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pendingActionKey !== null || selectedCandidateIdsResolved.length === 0}
                  onClick={clearCandidateSelection}
                >
                  Réinitialiser
                </Button>
                {canPublishCandidate ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    disabled={
                      pendingActionKey !== null ||
                      (selectedCandidateIdsResolved.length === 0 &&
                        candidates.every(
                          (candidate) =>
                            candidate.status === "published" || candidate.status === "rejected",
                        ))
                    }
                    onClick={() => void handleAutoFixCandidates()}
                  >
                    {selectedCandidateIdsResolved.length > 0
                      ? `Auto-corriger sélection (${selectedCandidateIdsResolved.length})`
                      : "Auto-corriger visibles"}
                  </Button>
                ) : null}
                {canDeleteCandidate ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="destructive"
                    disabled={pendingActionKey !== null || selectedCandidateIdsResolved.length === 0}
                    onClick={() => void handleDeleteSelectedCandidates()}
                  >
                    Supprimer sélection ({selectedCandidateIdsResolved.length})
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {canReadReview ? (
              <div className="space-y-3">
                {candidates.length ? (
                  candidates.map((candidate) => {
                    const requiredFields = buildCandidateRequiredFields(candidate);
                    const listingData = asRecord(candidate.listing);
                    const listingTags = Array.isArray(listingData?.tags)
                      ? listingData.tags
                          .map((item) => (typeof item === "string" ? item.trim() : ""))
                          .filter((item) => item.length > 0)
                      : [];
                    return (
                    <article key={candidate.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {canDeleteCandidate || canPublishCandidate ? (
                              <input
                                type="checkbox"
                                checked={selectedCandidateIdsResolved.includes(candidate.id)}
                                onChange={(event) =>
                                  toggleCandidateSelection(candidate.id, event.target.checked)
                                }
                              aria-label={`Sélectionner ${candidate.rawPostId}`}
                            />
                          ) : null}
                          <p className="font-medium text-slate-900">{candidate.rawPostId}</p>
                        </div>
                        <Badge variant={toStatusBadgeVariant(candidate.status)}>
                          {toReviewCandidateStatusLabel(candidate.status)}
                        </Badge>
                      </div>
                      {candidate.title ? (
                        <p className="mt-1 text-sm font-medium text-slate-800">{candidate.title}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        {candidate.typeProperty || "Type N/A"}
                        {candidate.price != null ? ` · ${formatNumber(candidate.price)} FCFA` : ""}
                        {candidate.city || candidate.province
                          ? ` · ${[candidate.city, candidate.province].filter(Boolean).join(", ")}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Annonceur: {candidate.announcerUid}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Publiée le (source): {toDateLabel(candidate.sourcePublishedAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Score: {formatNumber(candidate.score)}</p>
                      {listingTags.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">Tags: {listingTags.join(", ")}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        Raison auto: {candidate.autoReason || "non renseignée"}
                      </p>
                      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-700">
                            Attributs modèle · type {requiredFields.listingType}
                          </p>
                          <p className="text-xs text-slate-600">
                            OK {requiredFields.filledCount} / {requiredFields.rows.length} · Manquants{" "}
                            {requiredFields.missingCount}
                          </p>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {requiredFields.rows.map((field) => (
                            <div
                              key={`${candidate.id}_${field.key}`}
                              className="rounded border border-slate-200 bg-white px-2 py-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-slate-700">{field.label}</p>
                                <Badge variant={field.missing ? "danger" : "success"}>
                                  {field.missing ? "Manquant" : "OK"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {formatFieldValueForDisplay(field.key, field.value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {candidate.imageUrls.length ? (
                        <div className="mt-2">
                          <p className="mb-2 text-xs text-slate-500">
                            Médias détectés: {candidate.imageUrls.length}
                          </p>
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {candidate.imageUrls.map((imageUrl, index) => (
                              <a
                                key={`${candidate.id}_image_${index + 1}`}
                                href={imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="overflow-hidden rounded border border-slate-200"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imageUrl}
                                  alt={`Image ${index + 1} - ${candidate.rawPostId}`}
                                  className="h-24 w-full object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {candidate.sourcePostUrl ? (
                        <a
                          href={candidate.sourcePostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-brand-700 hover:underline"
                        >
                          Ouvrir le post source
                        </a>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canDeleteCandidate && candidate.status !== "published" ? (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={pendingActionKey !== null}
                            onClick={() => void handleDeleteCandidate(candidate)}
                          >
                            Supprimer
                          </Button>
                        ) : null}
                        {canRejectCandidate && candidate.status !== "rejected" && candidate.status !== "published" ? (
                          <Button
                            size="xs"
                            variant="destructive"
                            disabled={pendingActionKey !== null}
                            onClick={() => void handleRejectCandidate(candidate)}
                          >
                            Rejeter
                          </Button>
                        ) : null}
                        {canPublishCandidate && candidate.status !== "published" ? (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={pendingActionKey !== null}
                            onClick={() => void handleEditCandidateType(candidate)}
                          >
                            Corriger l'annonce
                          </Button>
                        ) : null}
                        {canPublishCandidate && candidate.status === "ready_to_publish" ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={pendingActionKey !== null}
                            onClick={() => void handlePublishCandidate(candidate)}
                          >
                            Valider et publier
                          </Button>
                        ) : null}
                      </div>
                    </article>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">Aucune candidate review.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-700">Permission manquante: social_import.review</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Historique décisions</h2>
            <Badge variant={canReadDecisions ? "success" : "warning"}>
              {canReadDecisions ? "Lecture autorisée" : "Permission manquante"}
            </Badge>
          </CardHeader>
          <CardContent>
            {canReadDecisions ? (
              <div className="space-y-3">
                {decisions.length ? (
                  decisions.map((decision) => (
                    <article key={decision.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{decision.rawPostId || decision.id}</p>
                        <Badge variant={toStatusBadgeVariant(decision.decision)}>{decision.decision}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Acteur: {decision.actorId || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-500">Annonceur: {decision.announcerUid || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-500">Job: {decision.jobId || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-500">Date: {toDateLabel(decision.createdAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Motif: {decision.reason || "non renseigné"}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Aucune décision enregistrée.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-700">Permission manquante: social_import.decision.read</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
